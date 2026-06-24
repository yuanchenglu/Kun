import { describe, expect, it } from 'vitest'
import { McpCapabilityConfig } from '../src/contracts/capabilities.js'
import { McpRuntimeManager } from '../src/adapters/tool/mcp-runtime-manager.js'
import type { McpClientLike } from '../src/adapters/tool/mcp-tool-provider.js'
import type { McpConnectionStateInfo } from '../src/adapters/tool/mcp-connection-manager.js'

function fakeClient(): McpClientLike {
  return {
    listTools: async () => ({
      tools: [
        {
          name: 'echo',
          description: 'Echo input',
          inputSchema: { type: 'object' }
        }
      ]
    }),
    callTool: async () => ({ ok: true }),
    close: async () => undefined
  }
}

describe('McpRuntimeManager', () => {
  it('does not create a duplicate observability connection during startup', async () => {
    let connectCount = 0
    const statuses: McpConnectionStateInfo[] = []
    const manager = new McpRuntimeManager({
      nowIso: () => '2026-06-24T00:00:00.000Z',
      clientFactory: async () => {
        connectCount += 1
        return fakeClient()
      },
      onServerStatusChange: (info) => statuses.push(info)
    })
    const config = McpCapabilityConfig.parse({
      enabled: true,
      servers: {
        demo: {
          enabled: true,
          transport: 'stdio',
          command: 'demo',
          trustScope: 'user',
          timeoutMs: 100
        }
      }
    })

    const result = await manager.initialize(config)

    expect(connectCount).toBe(1)
    expect(result.connectedServers).toBe(1)
    expect(statuses).toContainEqual(expect.objectContaining({
      serverId: 'demo',
      status: 'connected',
      toolCount: 1
    }))

    await result.close()
  })

  it('does not assume a global config file when no path is provided', () => {
    const manager = new McpRuntimeManager()

    expect(manager.getStatus()).toMatchObject({
      configFilePath: '',
      configLoaded: false,
      watching: false
    })
  })
})
