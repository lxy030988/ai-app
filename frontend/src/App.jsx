import { useState } from 'react'
import { GraphQLClient } from 'graphql-request'

// 配置 GraphQL 客户端（部署后改为你的 Worker 域名）
const client = new GraphQLClient('https://your-worker.your-domain.com/graphql')

function App() {
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)

    try {
      const query = `
        query GetAIResponse($prompt: String!) {
          generateText(prompt: $prompt) {
            text
            model
          }
        }
      `

      const data = await client.request(query, { prompt })
      setResponse(data.generateText.text)
    } catch (error) {
      console.error('Error:', error)
      setResponse('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold text-center mb-2 text-indigo-900">AI Chat Assistant</h1>
          <p className="text-center text-gray-600 mb-12">Powered by Cloudflare Workers + DeepSeek/OpenAI</p>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Enter your prompt</label>
                <textarea
                  value={prompt}
                  onChange={e => setPrompt(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  rows="4"
                  placeholder="Ask me anything..."
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Generating...' : 'Generate Response'}
              </button>
            </form>

            {response && (
              <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-3">Response:</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{response}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
