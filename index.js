#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import GhostAdminAPI from "@tryghost/admin-api";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Same environment contract as MFYDev/ghost-mcp, so both servers share one config block.
const GHOST_API_URL = process.env.GHOST_API_URL;
const GHOST_ADMIN_API_KEY = process.env.GHOST_ADMIN_API_KEY;
const GHOST_API_VERSION = process.env.GHOST_API_VERSION || "v5.0";

if (!GHOST_API_URL) {
  console.error("GHOST_API_URL is not set");
  process.exit(1);
}

if (!GHOST_ADMIN_API_KEY) {
  console.error("GHOST_ADMIN_API_KEY is not set");
  process.exit(1);
}

// A malformed key or URL throws here; report it in one readable line instead of a stack trace.
let api;
try {
  api = new GhostAdminAPI({
    url: GHOST_API_URL,
    key: GHOST_ADMIN_API_KEY,
    version: GHOST_API_VERSION,
  });
} catch (error) {
  console.error(`Ghost configuration rejected: ${error.message}`);
  process.exit(1);
}

// MCP carries no binary data, so every upload is addressed by a path on this machine.
function resolveLocalFile(input, label) {
  let candidate = String(input).trim();

  if (candidate.startsWith("file://")) {
    candidate = decodeURIComponent(new URL(candidate).pathname);
  }

  if (candidate === "~" || candidate.startsWith("~/")) {
    candidate = path.join(os.homedir(), candidate.slice(1));
  }

  const resolved = path.resolve(candidate);

  let stats;
  try {
    stats = fs.statSync(resolved);
  } catch {
    throw new Error(`${label} not found: ${resolved}`);
  }

  if (!stats.isFile()) {
    throw new Error(`${label} is not a file: ${resolved}`);
  }

  return resolved;
}

// Ghost puts the useful detail in `context`/`help` next to the message.
function describeError(error) {
  const parts = [error.message || String(error)];

  if (error.context) {
    parts.push(String(error.context));
  }

  if (error.help) {
    parts.push(String(error.help));
  }

  return parts.join(" — ");
}

function uploadResult(uploaded) {
  const url = uploaded?.url;

  if (!url) {
    return {
      content: [
        { type: "text", text: `Upload succeeded but returned no URL: ${JSON.stringify(uploaded)}` },
      ],
    };
  }

  const lines = [url];

  if (uploaded.ref) {
    lines.push(`ref: ${uploaded.ref}`);
  }

  return {
    content: [{ type: "text", text: lines.join("\n") }],
    structuredContent: { url, ref: uploaded.ref ?? null },
  };
}

async function runUpload(work) {
  try {
    return uploadResult(await work());
  } catch (error) {
    return {
      isError: true,
      content: [{ type: "text", text: `Ghost upload failed: ${describeError(error)}` }],
    };
  }
}

const server = new McpServer({
  name: "ghost-upload",
  version: "1.0.0",
});

server.registerTool(
  "ghost_upload_image",
  {
    title: "Upload image to Ghost",
    description:
      "Uploads an image file from this machine to Ghost and returns its public CDN URL. " +
      "The URL can be used as feature_image of a post or as <img src> inside post HTML. " +
      "Accepts a local path only (e.g. ~/Downloads/cover.jpg), never image data.",
    inputSchema: {
      file: z.string().describe("Absolute or ~-relative path to the image file on this machine"),
      purpose: z
        .enum(["image", "profile_image", "icon"])
        .optional()
        .describe("What the image is used for; defaults to image"),
      ref: z
        .string()
        .optional()
        .describe("Free-form reference returned unchanged in the response"),
    },
  },
  async ({ file, purpose, ref }) =>
    runUpload(() =>
      api.images.upload({
        file: resolveLocalFile(file, "Image"),
        purpose: purpose || "image",
        ...(ref ? { ref } : {}),
      })
    )
);

server.registerTool(
  "ghost_upload_file",
  {
    title: "Upload file to Ghost",
    description:
      "Uploads an arbitrary file (PDF, ZIP, …) from this machine to Ghost and returns its public URL, " +
      "suitable as a download link inside a post. Accepts a local path only.",
    inputSchema: {
      file: z.string().describe("Absolute or ~-relative path to the file on this machine"),
      ref: z
        .string()
        .optional()
        .describe("Free-form reference returned unchanged in the response"),
    },
  },
  async ({ file, ref }) =>
    runUpload(() =>
      api.files.upload({
        file: resolveLocalFile(file, "File"),
        ...(ref ? { ref } : {}),
      })
    )
);

server.registerTool(
  "ghost_upload_media",
  {
    title: "Upload media to Ghost",
    description:
      "Uploads a video or audio file from this machine to Ghost and returns its public URL, " +
      "optionally with a thumbnail image. Accepts local paths only.",
    inputSchema: {
      file: z.string().describe("Absolute or ~-relative path to the media file on this machine"),
      thumbnail: z
        .string()
        .optional()
        .describe("Absolute or ~-relative path to a thumbnail image for the media file"),
    },
  },
  async ({ file, thumbnail }) =>
    runUpload(() =>
      api.media.upload({
        file: resolveLocalFile(file, "Media file"),
        ...(thumbnail ? { thumbnail: resolveLocalFile(thumbnail, "Thumbnail") } : {}),
      })
    )
);

await server.connect(new StdioServerTransport());
