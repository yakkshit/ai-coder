import { useStore } from '@nanostores/react';
import { ClientOnly } from 'remix-utils/client-only';
import { chatStore } from '~/lib/stores/chat';
import { classNames } from '~/utils/classNames';
import { HeaderActionButtons } from './HeaderActionButtons.client';
import { ChatDescription } from '~/lib/persistence/ChatDescription.client';
import { motion } from 'framer-motion';
import { useState } from 'react';

export function Header() {
  const chat = useStore(chatStore);
  const [isHovered, setIsHovered] = useState(false);

  const logoVariants = {
    initial: { scale: 1 },
    hover: { scale: 1.05, transition: { duration: 0.2 } },
  };

  return (
    <header
      className={classNames(
        'flex items-center p-5 border-b h-[var(--header-height)] backdrop-blur-sm sticky top-0 z-50 transition-all duration-300',
        {
          'border-transparent shadow-none': !chat.started,
          'border-lime-200 dark:border-cyan-400 shadow-sm': chat.started,
          'text-gray-900': !chat.started, // Light theme default
          'dark:text-cyan-200': true, // Dark theme background and text
        },
      )}
    >
      <div className="flex items-center gap-3 z-logo cursor-pointer">
        <motion.div
          initial="initial"
          whileHover="hover"
          animate={isHovered ? 'hover' : 'initial'}
          variants={logoVariants}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative"
        >
          <a href="/" className="text-2xl font-bold flex items-center gap-2">
            <div
              className={classNames(
                'relative w-10 h-10 flex items-center justify-center rounded-lg shadow-md overflow-hidden',
                'bg-lime-500 dark:bg-[rgb(0,229,255)]',
              )}
            >
              <motion.div
                className={classNames('absolute inset-0 rounded-lg', 'bg-lime-400 dark:bg-[rgb(0,229,255)]')}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: isHovered ? 1 : 0, opacity: isHovered ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              />
              <span className={classNames('relative font-bold text-xl', 'text-white dark:text-black')}>L</span>
            </div>
            <span
              className={classNames(
                'font-extrabold tracking-tight bg-clip-text text-transparent',
                'bg-gradient-to-r from-lime-600 to-lime-400 dark:from-[rgb(0,229,255)] dark:to-cyan-300',
              )}
            >
              Lingo AI
            </span>
          </a>
        </motion.div>
      </div>

      {chat.started && (
        <>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="flex-1 px-4 truncate text-center text-gray-700 dark:text-cyan-100"
          >
            <ClientOnly>{() => <ChatDescription />}</ClientOnly>
          </motion.div>
          <ClientOnly>
            {() => (
              <motion.div
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="mr-1"
              >
                <HeaderActionButtons />
              </motion.div>
            )}
          </ClientOnly>
        </>
      )}
    </header>
  );
}
