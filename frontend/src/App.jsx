import React, { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sparkles, Github } from 'lucide-react'

// Markdown 渲染组件
const MarkdownRenderer = ({ content }) => {
  // 简单的 Markdown 解析
  const renderMarkdown = text => {
    if (!text) return null

    const lines = text.split('\n')
    const elements = []
    let codeBlock = ''
    let inCodeBlock = false
    let listItems = []
    let inList = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // 代码块
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={i} className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto my-3 font-mono text-sm">
              <code>{codeBlock}</code>
            </pre>
          )
          codeBlock = ''
          inCodeBlock = false
        } else {
          if (inList) {
            elements.push(
              <ul key={`list-${i}`} className="list-disc list-inside space-y-1 my-3">
                {listItems}
              </ul>
            )
            listItems = []
            inList = false
          }
          inCodeBlock = true
        }
        continue
      }

      if (inCodeBlock) {
        codeBlock += line + '\n'
        continue
      }

      // 标题
      if (line.startsWith('# ')) {
        if (inList) {
          elements.push(
            <ul key={`list-${i}`} className="list-disc list-inside space-y-1 my-3">
              {listItems}
            </ul>
          )
          listItems = []
          inList = false
        }
        elements.push(
          <h1 key={i} className="text-3xl font-bold mt-6 mb-3 text-gray-900">
            {line.substring(2)}
          </h1>
        )
      } else if (line.startsWith('## ')) {
        if (inList) {
          elements.push(
            <ul key={`list-${i}`} className="list-disc list-inside space-y-1 my-3">
              {listItems}
            </ul>
          )
          listItems = []
          inList = false
        }
        elements.push(
          <h2 key={i} className="text-2xl font-bold mt-5 mb-3 text-gray-800">
            {line.substring(3)}
          </h2>
        )
      } else if (line.startsWith('### ')) {
        if (inList) {
          elements.push(
            <ul key={`list-${i}`} className="list-disc list-inside space-y-1 my-3">
              {listItems}
            </ul>
          )
          listItems = []
          inList = false
        }
        elements.push(
          <h3 key={i} className="text-xl font-bold mt-4 mb-2 text-gray-800">
            {line.substring(4)}
          </h3>
        )
      }
      // 列表
      else if (line.match(/^[-*]\s/)) {
        const content = line.substring(2)
        listItems.push(
          <li key={i} className="text-gray-700">
            {renderInline(content)}
          </li>
        )
        inList = true
      } else if (line.match(/^\d+\.\s/)) {
        if (!inList || listItems.length === 0 || listItems[0].type === 'li') {
          if (inList && listItems.length > 0) {
            elements.push(
              <ul key={`list-${i}`} className="list-disc list-inside space-y-1 my-3">
                {listItems}
              </ul>
            )
            listItems = []
          }
        }
        const content = line.replace(/^\d+\.\s/, '')
        listItems.push(
          <li key={i} className="text-gray-700">
            {renderInline(content)}
          </li>
        )
        inList = true
      }
      // 空行
      else if (line.trim() === '') {
        if (inList) {
          const ListTag = listItems[0]?.type === 'li' ? 'ul' : 'ol'
          elements.push(
            <ListTag
              key={`list-${i}`}
              className={
                ListTag === 'ul' ? 'list-disc list-inside space-y-1 my-3' : 'list-decimal list-inside space-y-1 my-3'
              }
            >
              {listItems}
            </ListTag>
          )
          listItems = []
          inList = false
        }
        elements.push(<br key={i} />)
      }
      // 普通文本
      else {
        if (inList) {
          elements.push(
            <ul key={`list-${i}`} className="list-disc list-inside space-y-1 my-3">
              {listItems}
            </ul>
          )
          listItems = []
          inList = false
        }
        elements.push(
          <p key={i} className="text-gray-700 leading-relaxed my-2">
            {renderInline(line)}
          </p>
        )
      }
    }

    // 处理未关闭的列表
    if (inList) {
      elements.push(
        <ul key="list-end" className="list-disc list-inside space-y-1 my-3">
          {listItems}
        </ul>
      )
    }

    return elements
  }

  // 渲染行内元素（粗体、斜体、代码）
  const renderInline = text => {
    const parts = []
    let remaining = text
    let key = 0

    while (remaining) {
      // 行内代码
      const codeMatch = remaining.match(/`([^`]+)`/)
      if (codeMatch) {
        const before = remaining.substring(0, codeMatch.index)
        if (before) parts.push(processTextFormat(before, key++))
        parts.push(
          <code key={key++} className="bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-sm font-mono">
            {codeMatch[1]}
          </code>
        )
        remaining = remaining.substring(codeMatch.index + codeMatch[0].length)
        continue
      }

      // 粗体
      const boldMatch = remaining.match(/\*\*([^*]+)\*\*/)
      if (boldMatch) {
        const before = remaining.substring(0, boldMatch.index)
        if (before) parts.push(processTextFormat(before, key++))
        parts.push(
          <strong key={key++} className="font-bold">
            {boldMatch[1]}
          </strong>
        )
        remaining = remaining.substring(boldMatch.index + boldMatch[0].length)
        continue
      }

      // 斜体
      const italicMatch = remaining.match(/\*([^*]+)\*/)
      if (italicMatch) {
        const before = remaining.substring(0, italicMatch.index)
        if (before) parts.push(processTextFormat(before, key++))
        parts.push(
          <em key={key++} className="italic">
            {italicMatch[1]}
          </em>
        )
        remaining = remaining.substring(italicMatch.index + italicMatch[0].length)
        continue
      }

      parts.push(remaining)
      break
    }

    return parts
  }

  const processTextFormat = (text, key) => {
    return <span key={key}>{text}</span>
  }

  return <div className="markdown-content">{renderMarkdown(content)}</div>
}

function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const abortControllerRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async e => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')

    // 添加用户消息
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])

    // 添加空的助手消息用于流式更新
    setMessages(prev => [...prev, { role: 'assistant', content: '', isStreaming: true }])

    setIsLoading(true)
    abortControllerRef.current = new AbortController()

    try {
      // 使用 fetch 进行流式请求
      const response = await fetch('https://ai-graphql-worker.lxy3988.workers.dev/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: userMessage }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedContent = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.substring(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                accumulatedContent += parsed.content

                // 更新最后一条消息
                setMessages(prev => {
                  const newMessages = [...prev]
                  newMessages[newMessages.length - 1] = {
                    role: 'assistant',
                    content: accumulatedContent,
                    isStreaming: true
                  }
                  return newMessages
                })
              }
            } catch (e) {
              console.error('Parse error:', e)
            }
          }
        }
      }

      // 标记流式传输完成
      setMessages(prev => {
        const newMessages = [...prev]
        newMessages[newMessages.length - 1].isStreaming = false
        return newMessages
      })
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request aborted')
      } else {
        console.error('Error:', error)
        setMessages(prev => {
          const newMessages = [...prev]
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            content: '❌ 抱歉，生成回复时出现错误。请稍后重试。',
            isStreaming: false,
            isError: true
          }
          return newMessages
        })
      }
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI Chat Assistant</h1>
              <p className="text-xs text-gray-500">Powered by DeepSeek & Cloudflare</p>
            </div>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {messages.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">开始对话</h2>
              <p className="text-gray-600">输入任何问题，让 AI 为你解答</p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message, index) => (
                <div key={index} className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                  )}

                  <div
                    className={`max-w-3xl rounded-2xl px-6 py-4 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                        : message.isError
                        ? 'bg-red-50 border border-red-200'
                        : 'bg-white border border-gray-200 shadow-sm'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <p className="text-white leading-relaxed">{message.content}</p>
                    ) : (
                      <>
                        <MarkdownRenderer content={message.content} />
                        {message.isStreaming && (
                          <span className="inline-block w-2 h-5 bg-blue-500 animate-pulse ml-1" />
                        )}
                      </>
                    )}
                  </div>

                  {message.role === 'user' && (
                    <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <span className="text-sm font-semibold text-gray-700">You</span>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="输入你的问题..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            {isLoading ? (
              <button
                type="button"
                onClick={handleStop}
                className="px-6 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition flex items-center gap-2"
              >
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                停止
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
                发送
              </button>
            )}
          </form>
          <p className="text-xs text-gray-500 text-center mt-3"></p>
        </div>
      </div>
    </div>
  )
}

export default App
