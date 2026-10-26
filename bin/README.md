# Portable Binaries Directory

This directory is designated for standalone Windows executables used in portable desktop mode:

- `node.exe`: Portable Node.js runtime (v20+ x64)
- `ffmpeg.exe`: Static build of FFmpeg with H.264 / HEVC hardware acceleration
- `yt-dlp.exe`: Live stream extractor for YouTube and HLS/RTMP feeds
- `python.bat` / `python.cmd`: Command-line fallback shims for stream resolution

### Setup Instructions
1. Download `ffmpeg.exe` from [ffmpeg.org](https://ffmpeg.org/download.html) (or Gyan.dev Windows builds).
2. Download `yt-dlp.exe` from [github.com/yt-dlp/yt-dlp](https://github.com/yt-dlp/yt-dlp/releases).
3. Place `ffmpeg.exe` and `yt-dlp.exe` directly inside this `bin/` directory.

> **Note:** If these executables are not present in this folder, the application automatically falls back to executables registered in the system `PATH`.
