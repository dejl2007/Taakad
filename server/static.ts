import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // Build paths relative to project root
  // When running dist/index.cjs, __dirname would be dist/, so go up one level
  // When running from source (dev), adjust accordingly
  const baseDir = process.env.NODE_ENV === "production" 
    ? path.resolve(process.cwd()) 
    : path.resolve(process.cwd());
  
  const distPublicPath = path.join(baseDir, "dist", "public");
  const distPath = path.join(baseDir, "client", "dist");
  const clientPath = path.join(baseDir, "client");
  
  // Try to serve from dist/public first (built files)
  if (fs.existsSync(distPublicPath)) {
    app.use(express.static(distPublicPath));
    // Fall through to index.html if the file doesn't exist
    app.use((_req, res) => {
      res.sendFile(path.resolve(distPublicPath, "index.html"));
    });
  } else if (fs.existsSync(distPath)) {
    // Try alternative dist location
    app.use(express.static(distPath));
    app.use((_req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  } else if (process.env.NODE_ENV === "production") {
    throw new Error(
      `Could not find the build directory: ${distPublicPath}, make sure to build the client first`,
    );
  } else {
    // Development mode: serve files from client directory
    console.log("ℹ️  Client build directory not found. Serving from client/");
    
    // Serve public folder if it exists
    const publicPath = path.resolve(clientPath, "public");
    if (fs.existsSync(publicPath)) {
      app.use(express.static(publicPath));
    }
    
    // Serve static files from client folder
    app.use(express.static(clientPath));
    
    // Serve index.html for all remaining requests (SPA fallback)
    const indexPath = path.resolve(clientPath, "index.html");
    if (fs.existsSync(indexPath)) {
      app.use((_req, res) => {
        res.sendFile(indexPath);
      });
    } else {
      console.warn("⚠️  Client index.html not found at", indexPath);
    }
  }
}

