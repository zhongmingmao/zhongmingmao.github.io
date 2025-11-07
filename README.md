# ByteCoding

> Focus on Infrastructure, Java, Cloud Computing, and Software Development

A technical blog built with Hexo and hosted on GitHub Pages, sharing insights and experiences in modern software engineering.

## 🌐 [Live Blog](https://blog.zhongmingmao.top/)

## 📝 Content Areas

### 🤖 AI & Machine Learning
- **AI Agent**: Foundations, Overview, MCP (Model Context Protocol), A2A (Agent-to-Agent)
- **LLM**: Large Language Models, Pre-training techniques
- **Machine Learning**: Core concepts and practical applications

### ☁️ Cloud Native & DevOps
- **Kubernetes**: Architecture, components, orchestration patterns
- **Docker**: Containerization, best practices, optimization
- **DevOps**: CI/CD, Infrastructure as Code, observability
- **Microservices**: Design patterns, service mesh, distributed systems

### 📊 Big Data & Streaming
- **Apache Beam**: Unified programming model, pipelines, patterns
- **Apache Spark**: Core concepts, SQL, streaming, structured streaming
- **Apache Flink**: Stream processing concepts and applications
- **Data Engineering**: Batch vs stream processing, workflow orchestration

### 🔧 Infrastructure & Performance
- **Redis**: Data structures, distributed locking, performance optimization
- **Network Programming**: TCP/IP, HTTP, socket programming
- **Performance Engineering**: Testing, optimization, monitoring
- **Database Systems**: SQL, NoSQL, distributed databases

### 💻 Programming Languages
- **Java**: JVM internals, concurrency, Spring ecosystem, modern features
- **Go**: Core concepts, engineering practices, concurrency patterns
- **Rust**: Memory safety, ownership system, systems programming
- **Concurrency**: Multi-threading, async programming, distributed algorithms

## 🏗️ Technical Stack

- **Framework**: [Hexo](https://hexo.io/) v6.3.0
- **Theme**: [Butterfly](https://butterfly.js.org/)
- **Hosting**: GitHub Pages
- **Deployment**: Git-based workflow
- **Rendering**: Markdown with Pug templates
- **Syntax Highlighting**: Highlight.js with multiple themes
- **Math Support**: MathJax for mathematical expressions

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or later recommended)
- Git

### Local Development
```bash
# Clone the repository
git clone https://github.com/zhongmingmao/zhongmingmao.github.io.git
cd zhongmingmao.github.io

# Install dependencies
npm install

# Start development server
hexo clean && hexo server -g --debug

# Open browser
# Blog will be available at http://localhost:4000
```

### Create New Content
```bash
# Create new post
npx hexo new "Your Post Title"

# Create new page
npx hexo new page "page-name"
```

### Build and Deploy
```bash
# Generate static files
hexo generate

# Deploy to GitHub Pages
hexo deploy

# Or combine both steps
hexo generate --deploy
```

## 📁 Project Structure

```
├── source/
│   ├── _posts/           # Blog posts (Markdown files)
│   ├── css/              # Custom styles
│   ├── js/               # Custom scripts
│   └── img/              # Static images
├── themes/
│   ├── butterfly/        # Active theme
│   └── next/             # Alternative theme
├── _config.yml           # Main Hexo configuration
├── _config.butterfly.yml # Butterfly theme settings
├── package.json          # Dependencies and scripts
└── README.md
```

## ⚙️ Configuration

### Key Settings
- **URL**: `https://blog.zhongmingmao.top/`
- **Language**: English
- **Timezone**: Asia/Shanghai
- **Permalink**: `:year/:month/:day/:title/`

### Theme Features
- 🎨 Multiple syntax highlighting themes (Mac light/dark)
- 📱 Responsive design
- 🔍 Local search functionality
- 🏷️ Tag and category management
- 📊 Reading time estimation
- 🔗 Social media integration

## 🛠️ Development Guidelines

### Content Format
Posts should follow this front-matter structure:
```yaml
---
title: Post Title
mathjax: true
date: YYYY-MM-DD HH:MM:SS
cover: https://example.com/cover-image.webp
categories:
  - Main Category
  - Sub Category
tags:
  - tag1
  - tag2
---
```

### Writing Style
- Focus on practical, technical content
- Include code examples and demonstrations
- Provide clear explanations of complex concepts
- Use appropriate categories and tags for organization

## 📈 Statistics

- **Total Posts**: 200+ technical articles
- **Categories**: 15+ main categories
- **Tags**: 100+ specific tags
- **Topics Covered**: AI/ML, Cloud Native, Big Data, Infrastructure, Programming

## 🤝 Contributing

This is a personal blog, but contributions are welcome in the form of:
- Issue reports for technical problems
- Suggestions for improvement
- Corrections or updates to existing content

## 📄 License

Content is licensed under [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).

## 🔗 Connect

- **Blog**: https://blog.zhongmingmao.top/
- **GitHub**: https://github.com/zhongmingmao
- **Email**: Available through GitHub profile

---

> *Built with ❤️ using Hexo and hosted on GitHub Pages*