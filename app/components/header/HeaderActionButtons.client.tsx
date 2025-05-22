import type React from 'react';

import { useStore } from '@nanostores/react';
import useViewport from '~/lib/hooks';
import { chatStore } from '~/lib/stores/chat';
import { netlifyConnection } from '~/lib/stores/netlify';
import { vercelConnection } from '~/lib/stores/vercel';
import { workbenchStore } from '~/lib/stores/workbench';
import { classNames } from '~/utils/classNames';
import { useEffect, useRef, useState } from 'react';
import { streamingState } from '~/lib/stores/streaming';
import { NetlifyDeploymentLink } from '~/components/chat/NetlifyDeploymentLink.client';
import { VercelDeploymentLink } from '~/components/chat/VercelDeploymentLink.client';
import { useVercelDeploy } from '~/components/deploy/VercelDeploy.client';
import { useNetlifyDeploy } from '~/components/deploy/NetlifyDeploy.client';
import { motion, AnimatePresence } from 'framer-motion';

type HeaderActionButtonsProps = {};

export function HeaderActionButtons({}: HeaderActionButtonsProps) {
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const { showChat } = useStore(chatStore);
  const netlifyConn = useStore(netlifyConnection);
  const vercelConn = useStore(vercelConnection);
  const [activePreviewIndex] = useState(0);
  const previews = useStore(workbenchStore.previews);
  const activePreview = previews[activePreviewIndex];
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployingTo, setDeployingTo] = useState<'netlify' | 'vercel' | null>(null);
  const isSmallViewport = useViewport(1024);
  const canHideChat = showWorkbench || !showChat;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isStreaming = useStore(streamingState);
  const { handleVercelDeploy } = useVercelDeploy();
  const { handleNetlifyDeploy } = useNetlifyDeploy();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const onVercelDeploy = async () => {
    setIsDeploying(true);
    setDeployingTo('vercel');

    try {
      await handleVercelDeploy();
    } finally {
      setIsDeploying(false);
      setDeployingTo(null);
    }
  };

  const onNetlifyDeploy = async () => {
    setIsDeploying(true);
    setDeployingTo('netlify');

    try {
      await handleNetlifyDeploy();
    } finally {
      setIsDeploying(false);
      setDeployingTo(null);
    }
  };

  return (
    <div className="flex gap-3">
      <div className="relative" ref={dropdownRef}>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          disabled={isDeploying || !activePreview || isStreaming}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={classNames(
            'px-4 py-2 rounded-lg flex items-center gap-2 font-medium text-sm transition-all',
            isDeploying || !activePreview || isStreaming
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              : 'bg-lime-500 hover:bg-lime-600 text-white shadow-md hover:shadow-lg',
          )}
        >
          {isDeploying ? (
            <>
              <div className="animate-spin i-ph:circle-notch w-4 h-4" />
              <span>Deploying to {deployingTo}...</span>
            </>
          ) : (
            <>
              <div className="i-ph:rocket-launch w-4 h-4" />
              <span>Deploy</span>
              <div
                className={classNames(
                  'i-ph:caret-down w-4 h-4 transition-transform',
                  isDropdownOpen ? 'rotate-180' : '',
                )}
              />
            </>
          )}
        </motion.button>

        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 flex flex-col gap-1 z-50 p-2 mt-2 min-w-[15rem] bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-100 dark:border-gray-800"
            >
              <DeployButton
                icon={
                  <img
                    className="w-5 h-5"
                    height="24"
                    width="24"
                    crossOrigin="anonymous"
                    src="https://cdn.simpleicons.org/netlify"
                  />
                }
                label={!netlifyConn.user ? 'No Netlify Account Connected' : 'Deploy to Netlify'}
                onClick={() => {
                  onNetlifyDeploy();
                  setIsDropdownOpen(false);
                }}
                disabled={isDeploying || !activePreview || !netlifyConn.user}
                extra={netlifyConn.user && <NetlifyDeploymentLink />}
              />

              <DeployButton
                icon={
                  <img
                    className="w-5 h-5 bg-black p-1 rounded"
                    height="24"
                    width="24"
                    crossOrigin="anonymous"
                    src="https://cdn.simpleicons.org/vercel/white"
                    alt="vercel"
                  />
                }
                label={!vercelConn.user ? 'No Vercel Account Connected' : 'Deploy to Vercel'}
                onClick={() => {
                  onVercelDeploy();
                  setIsDropdownOpen(false);
                }}
                disabled={isDeploying || !activePreview || !vercelConn.user}
                extra={vercelConn.user && <VercelDeploymentLink />}
              />

              <DeployButton
                icon={
                  <img
                    className="w-5 h-5"
                    height="24"
                    width="24"
                    crossOrigin="anonymous"
                    src="https://cdn.simpleicons.org/cloudflare"
                    alt="cloudflare"
                  />
                }
                label="Deploy to Cloudflare (Coming Soon)"
                disabled={true}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex rounded-lg overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
        <ViewButton
          active={showChat}
          disabled={!canHideChat || isSmallViewport}
          onClick={() => {
            if (canHideChat) {
              chatStore.setKey('showChat', !showChat);
            }
          }}
          icon="i-bolt:chat"
          tooltip="Toggle Chat"
        />
        <div className="w-[1px] bg-gray-200 dark:bg-gray-700" />
        <ViewButton
          active={showWorkbench}
          onClick={() => {
            if (showWorkbench && !showChat) {
              chatStore.setKey('showChat', true);
            }

            workbenchStore.showWorkbench.set(!showWorkbench);
          }}
          icon="i-ph:code-bold"
          tooltip="Toggle Workbench"
        />
      </div>
    </div>
  );
}

interface DeployButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  extra?: React.ReactNode;
}

function DeployButton({ icon, label, onClick, disabled = false, extra }: DeployButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02, backgroundColor: disabled ? '' : 'rgba(236, 252, 203, 0.1)' }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={classNames(
        'flex items-center w-full px-4 py-2.5 text-sm rounded-md gap-2 transition-all',
        disabled
          ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
          : 'text-gray-700 dark:text-gray-300 hover:bg-lime-50 dark:hover:bg-lime-950/20',
      )}
    >
      {icon}
      <span className="mx-auto">{label}</span>
      {extra}
    </motion.button>
  );
}

interface ViewButtonProps {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: string;
  tooltip: string;
}

function ViewButton({ active, disabled = false, onClick, icon, tooltip }: ViewButtonProps) {
  return (
    <motion.button
      whileHover={{ backgroundColor: disabled || active ? '' : 'rgba(236, 252, 203, 0.1)' }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      className={classNames('flex items-center p-2 transition-all', {
        'bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400':
          !active,
        'bg-lime-500 dark:bg-lime-600 text-white': active && !disabled,
        'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed': disabled,
      })}
      onClick={onClick}
      title={tooltip}
      disabled={disabled}
    >
      <div className={`${icon} text-sm`} />
    </motion.button>
  );
}
