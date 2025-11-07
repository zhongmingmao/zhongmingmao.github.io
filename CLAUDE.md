# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Hexo blog hosted on GitHub Pages focused on technical content related to infrastructure, Java, cloud computing, and software development.

Key details:
- Blog name: ByteCoding
- Theme: Butterfly (primary), with Next theme as fallback
- Deployment: GitHub Pages (master branch)
- Source branch: blog (current working branch)
- URL: https://blog.zhongmingmao.top/
- Timezone: Asia/Shanghai

## Architecture

### Content Structure
- **Posts**: `source/_posts/` - Blog content in Markdown format with extensive front-matter
- **Pages**: `source/` - Static pages (about, categories, tags, etc.)
- **Themes**: `themes/butterfly/` (active) and `themes/next/` (inactive)
- **Generated**: `public/` - Built site output

### Configuration Hierarchy
1. `_config.yml` - Main Hexo configuration
2. `_config.butterfly.yml` - Butterfly theme settings
3. `package.json` - Dependencies and scripts

### Content Categories
The blog covers several technical domains:
- AI/ML (AI Agent, LLM, Machine Learning)
- Cloud Native (Kubernetes, Docker, DevOps)
- Big Data (Spark, Flink, Beam)
- Infrastructure (Redis, Network, Performance)
- Programming (Java, Go, Rust, Concurrency)

## Common Development Commands

### Local Development Workflow
```bash
# Clean and start development server
hexo clean && hexo server -g --debug

# Generate static files only
hexo generate

# Clean generated files and cache
hexo clean
```

### Content Creation
```bash
# Create new post (generates in source/_posts/)
npx hexo new "Post Title"

# Create new page
npx hexo new page "page-name"
```

### Deployment
```bash
# Deploy to GitHub Pages
hexo deploy

# Generate and deploy in one command
hexo generate --deploy
```

## Configuration Details

### Site Configuration (_config.yml)
- **URL Structure**: `:year/:month/:day/:title/`
- **Language**: English (en)
- **Timezone**: Asia/Shanghai
- **Skip render**: `gitbook/**`

### Theme Configuration (_config.butterfly.yml)
- **Highlight theme**: mac light/dark
- **Code copy**: enabled
- **Menu**: Home, Archives, Tags, Categories, About
- **Social links**: Configured in theme settings

### Content Front-matter Pattern
```yaml
---
title: Post Title
mathjax: true
date: YYYY-MM-DD HH:MM:SS
cover: https://example.com/image.webp
categories:
  - Main Category
  - Sub Category
tags:
  - tag1
  - tag2
---
```

## Development Notes

### File Organization
- **Posts**: Use descriptive names with date prefixes (though not strictly enforced)
- **Static assets**: Place in `source/` directory
- **Theme customization**: Modify `_config.butterfly.yml` before touching theme files
- **Backup files**: Posts with `.bak` extension are backup versions

### Dependency Management
- Node.js compatibility issues have been resolved (removed hexo-related-popular-posts)
- Use `npm install --legacy-peer-deps` if encountering peer dependency conflicts
- Main plugins: hexo-generator-* family, hexo-renderer-* family, hexo-server

### Known Issues
- **Travis CI**: Deprecated (mentioned in README but no longer used)
- **external_link config**: Shows deprecation warning but functional
- **Node.js**: Requires compatible versions for dependencies

## Content Guidelines

### Post Categories Structure
Posts follow a hierarchical categorization:
- Main technical domains (AI, Cloud Native, Big Data, etc.)
- Sub-categories for specific technologies
- Tags for fine-grained topic identification

### Supported Features
- MathJax for mathematical expressions
- Code syntax highlighting with multiple themes
- Cover images for posts
- Table of contents generation
- Search functionality (local search configured)

### Development Workflow
1. Create new post with `hexo new`
2. Write content in `source/_posts/`
3. Test locally with `hexo server`
4. Generate and deploy when ready
5. Commit changes to git repository