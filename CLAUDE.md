# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Hexo blog hosted on GitHub Pages with Travis CI integration. The blog focuses on technical content related to infrastructure, Java, cloud computing, and software development.

Key details:
- Blog name: ByteCoding
- Theme: Butterfly
- Deployment: GitHub Pages (branch: master) 
- Source branch: blog_source
- CI/CD: Travis CI (.travis.yml - deprecated)

## Directory Structure

- `source/_posts/` - Blog post content (Markdown files)
- `themes/butterfly/` - Main theme files
- `source/` - Site pages and static content
- `_config.yml` - Main Hexo configuration
- `_config.butterfly.yml` - Butterfly theme configuration

## Common Development Tasks

### Creating New Posts
```bash
npx hexo new "Post Title"
```

### Local Development
```bash
# Start local server with live reload
npx hexo server

# Generate static files
npx hexo generate

# Clean generated files and cache
npx hexo clean
```

### Deployment
```bash
# Deploy to GitHub Pages
npx hexo deploy

# Generate and deploy
npx hexo generate --deploy
```

## Configuration Files

1. `_config.yml` - Main Hexo configuration
2. `_config.butterfly.yml` - Theme-specific configuration
3. `package.json` - Project dependencies (Hexo and plugins)

## Theme Customization

The blog uses the Butterfly theme. Theme configuration is in:
- `_config.butterfly.yml` - Primary theme settings
- `themes/butterfly/` - Theme source files

## Content Guidelines

Blog posts are written in Markdown and stored in `source/_posts/`. File naming convention follows:
`YYYY-MM-DD-post-title.md`

Post front-matter typically includes:
```yaml
title: Post Title
date: YYYY-MM-DD HH:MM:SS
tags: [tag1, tag2]
categories: [category]
```