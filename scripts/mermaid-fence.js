'use strict'

/**
 * 把 ```mermaid 代码块围栏转换为 Butterfly 主题的 {% mermaid %} 标签写法，
 * 源文件保持标准围栏语法（Typora 可直接预览）。
 *
 * 背景：Hexo highlight 不认识 mermaid 语言，会把围栏降级渲染为
 * <figure class="highlight plaintext">，类名中不含 "mermaid"，HTML 层无从识别；
 * 而主题 5.x 前端只认 {% mermaid %} 标签产出的 .mermaid-wrap 结构。
 * Hexo 先展开标签再走 markdown 渲染，故在 before_post_render 阶段
 * 把顶格的 mermaid 围栏改写为标签语法，转义与包装交由主题完成。
 */

const FENCE_OPEN = /^(```+|~~~+)mermaid[ \t]*$/
const FENCE_CLOSE = /^(```+|~~~+)[ \t]*$/

const convert = source => {
  const lines = source.split('\n')
  const out = []
  let fence = null // 当前处于 mermaid 围栏内时的围栏符号（如 '```'）

  for (const line of lines) {
    if (fence) {
      const close = line.match(FENCE_CLOSE)
      if (close && close[1][0] === fence[0]) {
        out.push('{% endmermaid %}')
        fence = null
        continue
      }
      out.push(line)
      continue
    }
    const open = line.match(FENCE_OPEN)
    if (open) {
      fence = open[1]
      out.push('{% mermaid %}')
      continue
    }
    out.push(line)
  }
  return out.join('\n')
}

// 优先级 1：必须先于 hexo 核心的 backtick_code_block（默认 10）执行，
// 否则围栏已被预渲染为 highlight HTML，无法再识别 mermaid 语言标记
hexo.extend.filter.register('before_post_render', data => {
  if (!(hexo.theme.config.mermaid && hexo.theme.config.mermaid.enable)) return data
  data.content = convert(data.content)
  return data
}, 1)
