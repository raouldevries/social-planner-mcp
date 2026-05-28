/**
 * MCP Settings Component
 *
 * Manage MCP (Model Context Protocol) client registrations.
 * Allows users to register AI assistants like Claude Desktop to manage their posts.
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import {
  useMCPClients,
  useRegisterMCPClient,
  useRevokeMCPClient,
  useDeleteMCPClient,
} from '@/hooks/useMCP';
import { formatDistanceToNow } from 'date-fns';
import type { MCPScope } from '@social-planner/shared';

const AVAILABLE_SCOPES: { id: MCPScope; label: string; description: string }[] = [
  { id: 'read_posts', label: 'Read Posts', description: 'View posts and drafts' },
  { id: 'create_posts', label: 'Create Posts', description: 'Create new drafts' },
  {
    id: 'schedule_posts',
    label: 'Schedule Posts',
    description: 'Schedule for publishing (requires approval)',
  },
  { id: 'read_channels', label: 'Read Channels', description: 'View connected social accounts' },
  { id: 'read_analytics', label: 'Read Analytics', description: 'View post analytics' },
];

interface FormData {
  name: string;
  redirectUris: string[];
  scopes: MCPScope[];
}

const initialFormData: FormData = {
  name: '',
  redirectUris: ['http://localhost'],
  scopes: ['read_posts', 'read_channels'] as MCPScope[],
};

export function MCPSettings() {
  const { data: clientsData, isLoading } = useMCPClients();
  const registerMutation = useRegisterMCPClient();
  const revokeMutation = useRevokeMCPClient();
  const deleteMutation = useDeleteMCPClient();

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [newCredentials, setNewCredentials] = useState<{
    clientId: string;
    clientSecret: string;
  } | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleRegister = useCallback(async () => {
    const result = await registerMutation.mutateAsync({
      name: formData.name,
      redirectUris: formData.redirectUris.filter((u) => u.trim()),
      scopes: formData.scopes,
    });

    setNewCredentials(result.credentials);
    setShowRegisterModal(false);
    setShowCredentialsModal(true);
    setFormData(initialFormData);
  }, [formData, registerMutation]);

  const handleRevoke = useCallback(
    async (clientId: string, clientName: string) => {
      if (confirm(`Are you sure you want to revoke "${clientName}"? This cannot be undone.`)) {
        await revokeMutation.mutateAsync(clientId);
      }
    },
    [revokeMutation]
  );

  const handleDelete = useCallback(
    async (clientId: string, clientName: string) => {
      if (
        confirm(
          `Are you sure you want to permanently delete "${clientName}"? This cannot be undone.`
        )
      ) {
        await deleteMutation.mutateAsync(clientId);
      }
    },
    [deleteMutation]
  );

  const handleAddRedirectUri = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      redirectUris: [...prev.redirectUris, ''],
    }));
  }, []);

  const handleRemoveRedirectUri = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      redirectUris: prev.redirectUris.filter((_, i) => i !== index),
    }));
  }, []);

  const handleRedirectUriChange = useCallback((index: number, value: string) => {
    setFormData((prev) => {
      const newUris = [...prev.redirectUris];
      newUris[index] = value;
      return { ...prev, redirectUris: newUris };
    });
  }, []);

  const handleScopeToggle = useCallback((scopeId: MCPScope) => {
    setFormData((prev) => ({
      ...prev,
      scopes: prev.scopes.includes(scopeId)
        ? prev.scopes.filter((s) => s !== scopeId)
        : [...prev.scopes, scopeId],
    }));
  }, []);

  const handleCopyToClipboard = useCallback(async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const handleCloseRegisterModal = useCallback(() => {
    setShowRegisterModal(false);
    setFormData(initialFormData);
  }, []);

  const handleCloseCredentialsModal = useCallback(() => {
    setShowCredentialsModal(false);
    setNewCredentials(null);
  }, []);

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center h-64"
        role="status"
        aria-label="Loading MCP clients"
      >
        <Spinner size="lg" />
      </div>
    );
  }

  const clients = clientsData?.clients ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">AI Assistant Connections</h2>
          <p className="text-sm text-neutral-500 mt-1">
            Connect AI assistants like Claude Desktop to manage your posts
          </p>
        </div>
        <Button onClick={() => setShowRegisterModal(true)}>Register Client</Button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <InfoIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">What is MCP?</p>
            <p className="mt-1 text-blue-700">
              Model Context Protocol (MCP) allows AI assistants to securely interact with Acme
              Planner. Once connected, your AI assistant can help create, schedule, and manage
              social media posts.
            </p>
          </div>
        </div>
      </div>

      {/* Setup Guide Toggle */}
      <div className="border border-neutral-200 rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSetupGuide(!showSetupGuide)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-neutral-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <BookIcon className="w-5 h-5 text-neutral-500" />
            <span className="font-medium text-neutral-900">How to connect Claude Desktop</span>
          </div>
          <ChevronIcon
            className={`w-5 h-5 text-neutral-400 transition-transform ${showSetupGuide ? 'rotate-180' : ''}`}
          />
        </button>

        {showSetupGuide && (
          <div className="px-4 pb-4 border-t border-neutral-200 bg-neutral-50">
            <div className="pt-4 space-y-4 text-sm text-neutral-700">
              <div>
                <h4 className="font-medium text-neutral-900 mb-2">Step 1: Register a Client</h4>
                <p>
                  Click "Register Client" above and give it a name like "Claude Desktop - My
                  Computer". Select the permissions you want to grant.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-neutral-900 mb-2">Step 2: Save Your Credentials</h4>
                <p>
                  After registering, you'll receive a Client ID and Client Secret.{' '}
                  <span className="font-medium text-amber-700">Save these immediately</span> - the
                  secret won't be shown again.
                </p>
              </div>

              <div>
                <h4 className="font-medium text-neutral-900 mb-2">
                  Step 3: Configure Claude Desktop
                </h4>
                <p className="mb-2">Open your Claude Desktop configuration file:</p>
                <ul className="list-disc list-inside space-y-1 text-neutral-600 ml-2">
                  <li>
                    <span className="font-mono text-xs bg-neutral-200 px-1.5 py-0.5 rounded">
                      macOS:
                    </span>{' '}
                    ~/Library/Application Support/Claude/claude_desktop_config.json
                  </li>
                  <li>
                    <span className="font-mono text-xs bg-neutral-200 px-1.5 py-0.5 rounded">
                      Windows:
                    </span>{' '}
                    %APPDATA%\Claude\claude_desktop_config.json
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-neutral-900 mb-2">Step 4: Add the MCP Server</h4>
                <p className="mb-2">
                  Add the following to your config file, replacing YOUR_BASE64_CREDENTIALS with the
                  green "Base64 Credentials" value shown after registration:
                </p>
                <pre className="bg-neutral-900 text-neutral-100 p-3 rounded-lg text-xs overflow-x-auto">
                  {`{
  "mcpServers": {
    "social-planner-mcp": {
      "url": "${window.location.origin}/api/mcp",
      "headers": {
        "Authorization": "Basic YOUR_BASE64_CREDENTIALS"
      }
    }
  }
}`}
                </pre>
              </div>

              <div>
                <h4 className="font-medium text-neutral-900 mb-2">
                  Step 5: Restart Claude Desktop
                </h4>
                <p>
                  Fully quit and restart Claude Desktop. You should now be able to ask Claude to
                  help manage your Acme posts!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Clients List */}
      {clients.length === 0 ? (
        <div className="text-center py-12 bg-neutral-50 rounded-lg border border-neutral-200">
          <RobotIcon className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <p className="text-neutral-600 font-medium">No AI assistants connected yet</p>
          <p className="text-sm text-neutral-500 mt-1">
            Register a client to allow AI assistants to create and schedule posts
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {clients.map((client) => (
            <div
              key={client.id}
              className="bg-white border border-neutral-200 rounded-lg p-4 hover:border-neutral-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-neutral-900 truncate">{client.name}</h3>
                    {client.isActive ? (
                      <Badge variant="success" size="sm">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="warning" size="sm">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-neutral-500 font-mono mt-1 truncate">
                    {client.clientId}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {client.scopes.map((scope) => (
                      <span
                        key={scope}
                        className="px-2 py-0.5 text-xs bg-neutral-100 text-neutral-600 rounded"
                      >
                        {scope.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-neutral-400 mt-3">
                    {client.lastUsedAt
                      ? `Last used ${formatDistanceToNow(new Date(client.lastUsedAt), { addSuffix: true })}`
                      : 'Never used'}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  {!client.isActive && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(client.id, client.name)}
                      disabled={deleteMutation.isPending}
                    >
                      Delete
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleRevoke(client.id, client.name)}
                    disabled={revokeMutation.isPending}
                  >
                    Revoke
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register Modal */}
      <Modal
        isOpen={showRegisterModal}
        onClose={handleCloseRegisterModal}
        title="Register AI Assistant"
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Client Name <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g., Claude Desktop - Work Laptop"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <p className="text-xs text-neutral-500 mt-1">
              A friendly name to identify this connection
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Redirect URIs
            </label>
            <div className="space-y-2">
              {formData.redirectUris.map((uri, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder="http://localhost"
                    value={uri}
                    onChange={(e) => handleRedirectUriChange(i, e.target.value)}
                    className="flex-1"
                  />
                  {formData.redirectUris.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRedirectUri(i)}
                      className="px-2"
                    >
                      <XIcon className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleAddRedirectUri}
              className="mt-2"
            >
              + Add URI
            </Button>
            <p className="text-xs text-neutral-500 mt-1">
              For Claude Desktop, the default http://localhost is fine (not used with STDIO bridge)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Permissions <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2 bg-neutral-50 rounded-lg p-3">
              {AVAILABLE_SCOPES.map((scope) => (
                <label
                  key={scope.id}
                  className="flex items-start gap-3 cursor-pointer hover:bg-neutral-100 rounded p-2 -mx-1 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={formData.scopes.includes(scope.id)}
                    onChange={() => handleScopeToggle(scope.id)}
                    className="mt-0.5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-neutral-900">{scope.label}</span>
                    <p className="text-xs text-neutral-500">{scope.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200">
            <Button variant="ghost" onClick={handleCloseRegisterModal}>
              Cancel
            </Button>
            <Button
              onClick={handleRegister}
              disabled={
                !formData.name.trim() || formData.scopes.length === 0 || registerMutation.isPending
              }
              isLoading={registerMutation.isPending}
            >
              Register
            </Button>
          </div>
        </div>
      </Modal>

      {/* Credentials Modal */}
      <Modal
        isOpen={showCredentialsModal}
        onClose={handleCloseCredentialsModal}
        title="Client Credentials"
      >
        <div className="space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex gap-3">
              <WarningIcon className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                <span className="font-medium">Save these credentials now!</span>
                <br />
                The client secret will not be shown again.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">Client ID</label>
            <div className="relative">
              <code className="block p-3 pr-12 bg-neutral-100 rounded-lg text-sm break-all font-mono">
                {newCredentials?.clientId}
              </code>
              <button
                type="button"
                onClick={() => handleCopyToClipboard(newCredentials?.clientId ?? '', 'clientId')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-neutral-200 rounded transition-colors"
                title="Copy to clipboard"
              >
                {copiedField === 'clientId' ? (
                  <CheckIcon className="w-4 h-4 text-green-600" />
                ) : (
                  <CopyIcon className="w-4 h-4 text-neutral-500" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Client Secret
            </label>
            <div className="relative">
              <code className="block p-3 pr-12 bg-neutral-100 rounded-lg text-sm break-all font-mono">
                {newCredentials?.clientSecret}
              </code>
              <button
                type="button"
                onClick={() =>
                  handleCopyToClipboard(newCredentials?.clientSecret ?? '', 'clientSecret')
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-neutral-200 rounded transition-colors"
                title="Copy to clipboard"
              >
                {copiedField === 'clientSecret' ? (
                  <CheckIcon className="w-4 h-4 text-green-600" />
                ) : (
                  <CopyIcon className="w-4 h-4 text-neutral-500" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Base64 Credentials{' '}
              <span className="font-normal text-neutral-500">(for Claude Desktop config)</span>
            </label>
            <div className="relative">
              <code className="block p-3 pr-12 bg-green-50 border border-green-200 rounded-lg text-sm break-all font-mono">
                {newCredentials
                  ? btoa(`${newCredentials.clientId}:${newCredentials.clientSecret}`)
                  : ''}
              </code>
              <button
                type="button"
                onClick={() =>
                  handleCopyToClipboard(
                    newCredentials
                      ? btoa(`${newCredentials.clientId}:${newCredentials.clientSecret}`)
                      : '',
                    'base64'
                  )
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-green-100 rounded transition-colors"
                title="Copy to clipboard"
              >
                {copiedField === 'base64' ? (
                  <CheckIcon className="w-4 h-4 text-green-600" />
                ) : (
                  <CopyIcon className="w-4 h-4 text-neutral-500" />
                )}
              </button>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Copy this value directly into your Claude Desktop config
            </p>
          </div>

          <Button onClick={handleCloseCredentialsModal} className="w-full">
            I've saved the credentials
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// Icons
function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function RobotIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 14.5M14.25 3.104c.251.023.501.05.75.082M19.8 14.5a2.25 2.25 0 0 0-1.549-1.414l-.013-.003a24.292 24.292 0 0 0-8.476 0l-.013.003A2.25 2.25 0 0 0 8.2 14.5m11.6 0 .013.005a2.25 2.25 0 0 1 1.44 1.592l.094.543a5.25 5.25 0 0 1-2.023 5.063l-2.907 2.178a2.25 2.25 0 0 1-2.634 0l-2.907-2.178a5.25 5.25 0 0 1-2.023-5.063l.094-.543a2.25 2.25 0 0 1 1.44-1.592l.013-.005M8.2 14.5 6 17.25m6-3.75v3.75m6-3.75 2.2 2.75M12 21v-3"
      />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
      />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}
