import type React from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { Dialog, DialogButton, DialogDescription, DialogRoot, DialogTitle } from '~/components/ui/Dialog';
import { ControlPanel } from '~/components/@settings/core/ControlPanel';
import { db, deleteById, getAll, chatId, type ChatHistoryItem, useChatHistory } from '~/lib/persistence';
import { useSearchFilter } from '~/lib/hooks/useSearchFilter';
import { useStore } from '@nanostores/react';
import { profileStore } from '~/lib/stores/profile';
import { ThemeSwitch } from '~/components/ui/ThemeSwitch';

type DialogContent =
  | { type: 'delete'; item: ChatHistoryItem }
  | { type: 'bulkDelete'; items: ChatHistoryItem[] }
  | null;

// Animation variants
const menuVariants = {
  open: { x: 0, transition: { type: 'spring', damping: 20, stiffness: 100 } },
  closed: { x: '-100%', transition: { duration: 0.3 } },
};

const itemVariants = {
  open: { opacity: 1, y: 0, transition: { delay: 0.1, duration: 0.3 } },
  closed: { opacity: 0, y: 20, transition: { duration: 0.2 } },
};

function CurrentDateTime() {
  const [dateTime, setDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setDateTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      variants={itemVariants}
      className="flex flex-col gap-0.5"
      style={{
        background: 'var(--current-dt-bg, transparent)',
        borderRadius: '0.75rem',
        padding: '0.75rem 1rem',
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="h-4 w-4 i-ph:clock"
          style={{
            color: 'var(--current-dt-icon, #84cc16) dark:text-[rgb(0,229,255)]',
          }}
        />
        <div
          className="text-3xl font-bold"
          style={{
            color: '#fff dark:#00000', // Always white for time
          }}
        >
          {dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
      <div
        className="text-xs opacity-70"
        style={{
          color: 'var(--current-dt-label, #64748b)',
        }}
      >
        CURRENT TIME ZONE ({Intl.DateTimeFormat().resolvedOptions().timeZone})
      </div>
      <style>{`
      :global(html.dark) {
        --current-dt-bg: rgb(0,229,255);
        --current-dt-icon: rgb(0,229,255);
        --current-dt-label: rgb(0,0,0,0.7);
      }
      :global(html:not(.dark)) {
        --current-dt-bg: #d9f99d;
        --current-dt-icon: #84cc16;
        --current-dt-label: #1e293b;
      }
      `}</style>
    </motion.div>
  );
}

export const Menu = () => {
  const { duplicateCurrentChat, exportChat } = useChatHistory();
  const [list, setList] = useState<ChatHistoryItem[]>([]);
  const [open, setOpen] = useState(false);
  const [dialogContent, setDialogContent] = useState<DialogContent>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const profile = useStore(profileStore);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const conversationsRef = useRef<HTMLDivElement>(null);

  const { filteredItems: filteredList, handleSearchChange } = useSearchFilter({
    items: list,
    searchFields: ['description'],
  });

  const loadEntries = useCallback(() => {
    if (db) {
      getAll(db)
        .then((list: ChatHistoryItem[]) => list.filter((item: ChatHistoryItem) => item.urlId && item.description))
        .then(setList)
        .catch((error: Error) => toast.error(error.message));
    }
  }, []);

  const deleteChat = useCallback(
    async (id: string): Promise<void> => {
      if (!db) {
        throw new Error('Database not available');
      }

      // Delete chat snapshot from localStorage
      try {
        const snapshotKey = `snapshot:${id}`;
        localStorage.removeItem(snapshotKey);
        console.log('Removed snapshot for chat:', id);
      } catch (snapshotError) {
        console.error(`Error deleting snapshot for chat ${id}:`, snapshotError);
      }

      // Delete the chat from the database
      await deleteById(db, id);
      console.log('Successfully deleted chat:', id);
    },
    [db],
  );

  const deleteItem = useCallback(
    (event: React.UIEvent, item: ChatHistoryItem) => {
      event.preventDefault();
      event.stopPropagation();

      // Log the delete operation to help debugging
      console.log('Attempting to delete chat:', { id: item.id, description: item.description });

      deleteChat(item.id)
        .then(() => {
          toast.success('Chat deleted successfully', {
            position: 'bottom-right',
            autoClose: 3000,
          });

          // Always refresh the list
          loadEntries();

          if (chatId.get() === item.id) {
            // hard page navigation to clear the stores
            console.log('Navigating away from deleted chat');
            window.location.pathname = '/';
          }
        })
        .catch((error) => {
          console.error('Failed to delete chat:', error);
          toast.error('Failed to delete conversation', {
            position: 'bottom-right',
            autoClose: 3000,
          });

          // Still try to reload entries in case data has changed
          loadEntries();
        });
    },
    [loadEntries, deleteChat],
  );

  const deleteSelectedItems = useCallback(
    async (itemsToDeleteIds: string[]) => {
      if (!db || itemsToDeleteIds.length === 0) {
        console.log('Bulk delete skipped: No DB or no items to delete.');
        return;
      }

      console.log(`Starting bulk delete for ${itemsToDeleteIds.length} chats`, itemsToDeleteIds);

      let deletedCount = 0;
      const errors: string[] = [];
      const currentChatId = chatId.get();
      let shouldNavigate = false;

      // Process deletions sequentially using the shared deleteChat logic
      for (const id of itemsToDeleteIds) {
        try {
          await deleteChat(id);
          deletedCount++;

          if (id === currentChatId) {
            shouldNavigate = true;
          }
        } catch (error) {
          console.error(`Error deleting chat ${id}:`, error);
          errors.push(id);
        }
      }

      // Show appropriate toast message
      if (errors.length === 0) {
        toast.success(`${deletedCount} chat${deletedCount === 1 ? '' : 's'} deleted successfully`);
      } else {
        toast.warning(`Deleted ${deletedCount} of ${itemsToDeleteIds.length} chats. ${errors.length} failed.`, {
          autoClose: 5000,
        });
      }

      // Reload the list after all deletions
      await loadEntries();

      // Clear selection state
      setSelectedItems([]);
      setSelectionMode(false);

      // Navigate if needed
      if (shouldNavigate) {
        console.log('Navigating away from deleted chat');
        window.location.pathname = '/';
      }
    },
    [deleteChat, loadEntries, db],
  );

  const closeDialog = () => {
    setDialogContent(null);
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);

    if (selectionMode) {
      // If turning selection mode OFF, clear selection
      setSelectedItems([]);
    }
  };

  const toggleItemSelection = useCallback((id: string) => {
    setSelectedItems((prev) => {
      const newSelectedItems = prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id];
      console.log('Selected items updated:', newSelectedItems);

      return newSelectedItems; // Return the new array
    });
  }, []); // No dependencies needed

  const handleBulkDeleteClick = useCallback(() => {
    if (selectedItems.length === 0) {
      toast.info('Select at least one chat to delete');
      return;
    }

    const selectedChats = list.filter((item) => selectedItems.includes(item.id));

    if (selectedChats.length === 0) {
      toast.error('Could not find selected chats');
      return;
    }

    setDialogContent({ type: 'bulkDelete', items: selectedChats });
  }, [selectedItems, list]); // Keep list dependency

  const selectAll = useCallback(() => {
    const allFilteredIds = filteredList.map((item) => item.id);
    setSelectedItems((prev) => {
      const allFilteredAreSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => prev.includes(id));

      if (allFilteredAreSelected) {
        // Deselect only the filtered items
        const newSelectedItems = prev.filter((id) => !allFilteredIds.includes(id));
        console.log('Deselecting all filtered items. New selection:', newSelectedItems);

        return newSelectedItems;
      } else {
        // Select all filtered items, adding them to any existing selections
        const newSelectedItems = [...new Set([...prev, ...allFilteredIds])];
        console.log('Selecting all filtered items. New selection:', newSelectedItems);

        return newSelectedItems;
      }
    });
  }, [filteredList]); // Depends only on filteredList

  const shareChat = useCallback((id: string, urlId: string) => {
    const url = `${window.location.origin}/chat/${urlId}`;

    // Try to use the clipboard API if available
    if (navigator.clipboard) {
      navigator.clipboard
        .writeText(url)
        .then(() => {
          toast.success('Chat URL copied to clipboard', {
            position: 'bottom-right',
            autoClose: 3000,
          });
        })
        .catch((err) => {
          console.error('Failed to copy URL: ', err);

          // Fallback to prompt
          prompt('Copy this URL to share the chat:', url);
        });
    } else {
      // Fallback for browsers without clipboard API
      prompt('Copy this URL to share the chat:', url);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadEntries();
    }
  }, [open, loadEntries]);

  const handleDuplicate = async (id: string) => {
    await duplicateCurrentChat(id);
    loadEntries(); // Reload the list after duplication
  };

  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
    setOpen(false);
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
  };

  // Toggle sidebar with keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && e.metaKey) {
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Navigation links
  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about' },
    { name: 'Features', href: '/features' },
    { name: 'Get Started', href: '/get-started' },
    { name: 'Contact', href: '/contact' },
  ];

  // Social links
  const socialLinks = [
    { name: 'WA', href: '#', icon: 'i-ph:whatsapp-logo' },
    { name: 'X', href: '#', icon: 'i-ph:twitter-logo' },
    { name: 'IG', href: '#', icon: 'i-ph:instagram-logo' },
    { name: 'LI', href: '#', icon: 'i-ph:linkedin-logo' },
    { name: 'EMAIL', href: '#', icon: 'i-ph:envelope' },
  ];

  // Quick action links
  const quickActions = [
    { name: 'New Project', icon: 'i-ph:plus-circle' },
    { name: 'Templates', icon: 'i-ph:template' },
    { name: 'Explore', icon: 'i-ph:compass' },
    { name: 'Help', icon: 'i-ph:question' },
  ];

  const formatDate = (timestamp: number | string | undefined): string => {
    if (!timestamp) {
      return 'No date';
    }

    try {
      const date = new Date(timestamp);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'No date';
      }

      return date.toLocaleDateString();
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'No date';
    }
  };

  return (
    <>
      {/* Sidebar toggle button - positioned lower to avoid blocking logo */}
      <motion.button
        className="fixed left-6 top-20 z-50 w-12 h-12 rounded-full bg-lime-500 dark:bg-[rgb(0,229,255)] text-white dark:text-black shadow-lg flex items-center justify-center"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(true)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="i-ph:list text-xl" />
      </motion.button>

      {/* Overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Full screen sidebar */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            initial="closed"
            animate="open"
            exit="closed"
            variants={menuVariants}
            className="fixed inset-y-0 left-0 w-full bg-white dark:bg-black text-gray-900 dark:text-white z-50 flex flex-col overflow-hidden"
          >
            {/* Top navigation bar with social links */}
            <motion.div variants={itemVariants} className="flex items-center justify-between py-4 px-5">
              <div className="flex items-center gap-5">
                {socialLinks.map((link) => (
                  <motion.a
                    key={link.name}
                    href={link.href}
                    className="text-sm hover:text-lime-400 dark:hover:text-[rgb(0,229,255)] transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {link.name}
                  </motion.a>
                ))}
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-black dark:bg-[rgb(0,229,255)] bg-lime-400"
              >
                <div className="i-ph:x text-lg" />
              </motion.button>
            </motion.div>

            <div className="flex flex-1 overflow-hidden">
              {/* Left side with navigation and settings */}
              <div className="w-1/2 py-3 px-5 flex flex-col overflow-hidden">
                <motion.nav className="space-y-3 mb-6">
                  {navLinks.map((link) => (
                    <motion.div key={link.name} whileHover={{ x: 5 }} className="py-1">
                      <a
                        href={link.href}
                        className="text-4xl font-bold hover:text-lime-400 dark:hover:text-[rgb(0,229,255)] transition-colors block"
                      >
                        {link.name}
                      </a>
                    </motion.div>
                  ))}
                </motion.nav>

                {/* Action buttons moved below Contact */}
                <motion.div className="space-y-3 mb-6">
                  <motion.a
                    href="/"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-5 py-2 bg-lime-500 dark:bg-[rgb(0,229,255)] hover:bg-lime-600 dark:hover:bg-[rgb(0,200,220)] rounded-full text-white dark:text-black transition-colors inline-flex items-center gap-2 text-base"
                  >
                    <div className="i-ph:plus-circle h-4 w-4" />
                    Start New Chat
                  </motion.a>

                  <div className="flex gap-3 flex-wrap">
                    {quickActions.map((action) => (
                      <motion.button
                        key={action.name}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-3 py-1.5 bg-white/5 dark:bg-[rgb(0,229,255,0.08)] hover:bg-white/10 dark:hover:bg-[rgb(0,229,255,0.15)] rounded-lg text-gray-900 dark:text-[rgb(0,229,255)] transition-colors flex items-center gap-1.5 text-sm"
                      >
                        <div className={`${action.icon} h-3.5 w-3.5`} />
                        {action.name}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>

                {/* Settings and Theme controls */}
                <div className="mt-auto py-3 border-t border-white/10 dark:border-[rgb(0,229,255,0.15)]">
                  <div className="flex flex-wrap gap-2">
                    <ThemeSwitch />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSettingsClick}
                      className="px-3 py-1.5 bg-white/10 dark:bg-[rgb(0,229,255,0.15)] hover:bg-white/20 dark:hover:bg-[rgb(0,229,255,0.25)] rounded-lg transition-colors flex items-center gap-1.5 text-sm text-gray-900 dark:text-[rgb(0,229,255)]"
                    >
                      <div className="i-ph:gear h-3.5 w-3.5" />
                      Settings
                    </motion.button>

                    {/* <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="px-3 py-1.5 bg-white/10 dark:bg-[rgb(0,229,255,0.15)] hover:bg-white/20 dark:hover:bg-[rgb(0,229,255,0.25)] rounded transition-colors flex items-center gap-1.5 text-sm text-gray-900 dark:text-[rgb(0,229,255)]"
                    > */}
                    {/* </motion.div> */}

                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="flex items-center gap-3 px-3 py-1.5 bg-white/10 dark:bg-[rgb(0,229,255,0.15)] hover:bg-white/20 dark:hover:bg-[rgb(0,229,255,0.25)] rounded-lg transition-colors text-sm min-w-0 text-gray-900 dark:text-[rgb(0,229,255)]"
                    >
                      <div className="i-ph:user-circle h-5 w-5 text-lime-400 dark:text-[rgb(0,229,255)]" />
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold truncate text-gray-900 dark:text-[rgb(0,229,255)]">
                          {profile?.username || 'Guest'}
                        </span>
                      </div>
                    </motion.div>

                    {filteredList.length > 0 && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={toggleSelectionMode}
                        className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-sm transition-colors ${
                          selectionMode
                            ? 'bg-lime-500 text-white dark:bg-[rgb(0,229,255)] dark:text-black'
                            : 'bg-white/10 dark:bg-[rgb(0,229,255,0.15)] text-gray-900 dark:text-[rgb(0,229,255)] hover:bg-white/20 dark:hover:bg-[rgb(0,229,255,0.25)]'
                        }`}
                      >
                        <div className={`${selectionMode ? 'i-ph:check-circle' : 'i-ph:selection'} h-3.5 w-3.5`} />
                        {selectionMode ? 'Cancel' : 'Select'}
                      </motion.button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right side with time and chat history */}
              <div className="w-1/2 py-3 px-5 flex flex-col overflow-hidden">
                <div className="mb-6">
                  <div className="text-4xl font-bold mb-3 text-gray-900 dark:text-white">
                    We are based in <span className="text-lime-400 dark:text-[rgb(0,229,255)]">New York</span> and work
                    remotely.
                  </div>
                </div>

                <CurrentDateTime />

                {/* Chat history section */}
                <div className="mt-6 flex-1 overflow-hidden flex flex-col">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-lg font-semibold text-gray-900 dark:text-[rgb(0,229,255)]">
                      Recent Conversations
                    </div>

                    {/* Search bar */}
                    <div className="relative flex items-center mr-2 mt-1">
                      <input
                        type="text"
                        placeholder="Search conversations..."
                        onChange={handleSearchChange}
                        className="pl-4 pr-4 py-1.5 rounded-full bg-white/10 dark:bg-[rgb(0,229,255,0.10)] text-gray-900 dark:text-[rgb(0,229,255)] placeholder-gray-400 dark:placeholder-[rgb(0,229,255,0.7)] focus:outline-none focus:ring-2 focus:ring-lime-400 dark:focus:ring-[rgb(0,229,255)] transition-all w-56 shadow-md"
                        style={{
                          backdropFilter: 'blur(6px)',
                          WebkitBackdropFilter: 'blur(6px)',
                        }}
                      />
                      {/* <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-lime-400 dark:text-[rgb(0,229,255)] hover:text-lime-300 dark:hover:text-[rgb(0,200,220)] transition-colors"
                        tabIndex={-1}
                        aria-label="Search"
                      ></button> */}
                    </div>

                    {/* Selection controls */}
                    {selectionMode && (
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={selectAll}
                          className="px-2 py-1 bg-white/10 dark:bg-[rgb(0,229,255,0.15)] hover:bg-white/20 dark:hover:bg-[rgb(0,229,255,0.25)] rounded text-xs text-gray-900 dark:text-[rgb(0,229,255)] flex items-center gap-1"
                        >
                          <div className="i-ph:check-square h-3 w-3" />
                          Select All
                        </motion.button>

                        {selectedItems.length > 0 && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleBulkDeleteClick}
                            className="px-2 py-1 bg-red-500/80 hover:bg-red-500 rounded text-xs text-white dark:text-black flex items-center gap-1"
                          >
                            <div className="i-ph:trash h-3 w-3" />
                            Delete ({selectedItems.length})
                          </motion.button>
                        )}
                      </div>
                    )}
                  </div>

                  <div
                    ref={conversationsRef}
                    className="overflow-auto flex-1 pr-3 -mr-3 modern-scrollbar"
                    style={{ maxHeight: 'calc(100vh - 320px)' }}
                  >
                    {filteredList.length === 0 ? (
                      <div className="text-gray-500 dark:text-[rgb(0,229,255,0.7)] py-2">No conversations yet</div>
                    ) : (
                      <div className="space-y-2">
                        {filteredList.map((item: ChatHistoryItem) => (
                          <motion.div
                            key={item.id}
                            className={`block p-2.5 rounded-lg ${
                              selectionMode && selectedItems.includes(item.id)
                                ? 'bg-lime-500/20 dark:bg-[rgb(0,229,255,0.15)] border border-lime-500/50 dark:border-[rgb(0,229,255,0.5)]'
                                : 'bg-white/5 dark:bg-[rgb(0,229,255,0.08)] hover:bg-white/10 dark:hover:bg-[rgb(0,229,255,0.15)]'
                            } transition-colors group relative`}
                            whileHover={{ x: 3 }}
                          >
                            {/* Selection checkbox */}
                            {selectionMode && (
                              <div
                                className="absolute left-2 top-1/2 -translate-y-1/2 cursor-pointer"
                                onClick={() => toggleItemSelection(item.id)}
                              >
                                <div
                                  className={`h-4 w-4 rounded border ${
                                    selectedItems.includes(item.id)
                                      ? 'bg-lime-500 dark:bg-[rgb(0,229,255)] border-lime-500 dark:border-[rgb(0,229,255)]'
                                      : 'border-white/30 dark:border-[rgb(0,229,255,0.3)]'
                                  } flex items-center justify-center`}
                                >
                                  {selectedItems.includes(item.id) && (
                                    <div className="i-ph:check h-3 w-3 text-white dark:text-black" />
                                  )}
                                </div>
                              </div>
                            )}

                            <a
                              href={selectionMode ? undefined : `/chat/${item.urlId}`}
                              className={`block ${selectionMode ? 'pl-6 cursor-default' : ''}`}
                              onClick={(e) => {
                                if (selectionMode) {
                                  e.preventDefault();
                                  toggleItemSelection(item.id);
                                }
                              }}
                            >
                              <div className="font-medium truncate pr-20 text-gray-900 dark:text-white">
                                {item.description}
                              </div>
                              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                {formatDate(item.timestamp)}
                              </div>
                            </a>

                            {/* Action buttons */}
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-1 rounded-full hover:bg-white/10 dark:hover:bg-[rgb(0,229,255,0.15)]"
                                onClick={(e: React.MouseEvent) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  shareChat(item.id, item.urlId || '');
                                }}
                                title="Share"
                              >
                                <div className="i-ph:share-network h-3.5 w-3.5 text-black hover:text-lime-400 dark:hover:text-[rgb(0,229,255)]" />
                              </motion.button>

                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-1 rounded-full hover:bg-white/10 dark:hover:bg-[rgb(0,229,255,0.15)]"
                                onClick={(e: React.MouseEvent) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  exportChat(item.id);
                                }}
                                title="Export"
                              >
                                <div className="i-ph:download-simple h-3.5 w-3.5 text-black hover:text-lime-400 dark:hover:text-[rgb(0,229,255)]" />
                              </motion.button>

                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-1 rounded-full hover:bg-white/10 dark:hover:bg-[rgb(0,229,255,0.15)]"
                                onClick={(e: React.MouseEvent) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDuplicate(item.id);
                                }}
                                title="Duplicate"
                              >
                                <div className="i-ph:copy h-3.5 w-3.5 text-black hover:text-lime-400 dark:hover:text-[rgb(0,229,255)]" />
                              </motion.button>

                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-1 rounded-full hover:bg-white/10 dark:hover:bg-[rgb(0,229,255,0.15)]"
                                onClick={(e: React.MouseEvent) => {
                                  e.preventDefault();
                                  e.stopPropagation();

                                  // Implement rename functionality
                                }}
                                title="Rename"
                              >
                                <div className="i-ph:pencil-fill h-3.5 w-3.5 text-black hover:text-lime-400 dark:hover:text-[rgb(0,229,255)]" />
                              </motion.button>

                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="p-1 rounded-full hover:bg-white/10 dark:hover:bg-[rgb(0,229,255,0.15)]"
                                onClick={(e: React.MouseEvent) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  deleteItem(e, item);
                                }}
                                title="Delete"
                              >
                                <div className="i-ph:trash h-3.5 w-3.5 text-red hover:text-red-400 dark:hover:text-red-400" />
                              </motion.button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <motion.div
              variants={itemVariants}
              className="flex items-center justify-between py-3 px-5 text-xs text-gray-400 dark:text-[rgb(0,229,255,0.7)]"
            >
              <div>© 2025 Lingo AI. All rights reserved.</div>
              <div className="flex gap-4">
                <a href="#" className="hover:text-gray-900 dark:hover:text-[rgb(0,229,255)] transition-colors">
                  Terms
                </a>
                <a href="#" className="hover:text-gray-900 dark:hover:text-[rgb(0,229,255)] transition-colors">
                  Privacy
                </a>
                <a href="#" className="hover:text-gray-900 dark:hover:text-[rgb(0,229,255)] transition-colors">
                  Cookies
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings panel */}
      <ControlPanel open={isSettingsOpen} onClose={handleSettingsClose} />

      {/* Dialogs */}
      <DialogRoot open={dialogContent !== null}>
        <Dialog onBackdrop={closeDialog} onClose={closeDialog}>
          {dialogContent?.type === 'delete' && (
            <>
              <div className="p-6 bg-white dark:bg-black">
                <DialogTitle className="text-gray-900 dark:text-[rgb(0,229,255)]">Delete Chat?</DialogTitle>
                <DialogDescription className="mt-2 text-gray-600 dark:text-[rgb(0,229,255,0.7)]">
                  <p>
                    You are about to delete{' '}
                    <span className="font-medium text-gray-900 dark:text-[rgb(0,229,255)]">
                      {dialogContent.item.description}
                    </span>
                  </p>
                  <p className="mt-2">Are you sure you want to delete this chat?</p>
                </DialogDescription>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-black border-t border-gray-100 dark:border-[rgb(0,229,255,0.15)]">
                <DialogButton type="secondary" onClick={closeDialog}>
                  Cancel
                </DialogButton>
                <DialogButton
                  type="danger"
                  onClick={(event) => {
                    console.log('Dialog delete button clicked for item:', dialogContent.item);
                    deleteItem(event, dialogContent.item);
                    closeDialog();
                  }}
                >
                  Delete
                </DialogButton>
              </div>
            </>
          )}
          {dialogContent?.type === 'bulkDelete' && (
            <>
              <div className="p-6 bg-white dark:bg-black">
                <DialogTitle className="text-gray-900 dark:text-[rgb(0,229,255)]">Delete Selected Chats?</DialogTitle>
                <DialogDescription className="mt-2 text-gray-600 dark:text-[rgb(0,229,255,0.7)]">
                  <p>
                    You are about to delete {dialogContent.items.length}{' '}
                    {dialogContent.items.length === 1 ? 'chat' : 'chats'}:
                  </p>
                  <div className="mt-2 max-h-32 overflow-auto border border-gray-100 dark:border-[rgb(0,229,255,0.15)] rounded-md bg-gray-50 dark:bg-black p-2">
                    <ul className="list-disc pl-5 space-y-1">
                      {dialogContent.items.map((item) => (
                        <li key={item.id} className="text-sm">
                          <span className="font-medium text-gray-900 dark:text-[rgb(0,229,255)]">
                            {item.description}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="mt-3">Are you sure you want to delete these chats?</p>
                </DialogDescription>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 dark:bg-black border-t border-gray-100 dark:border-[rgb(0,229,255,0.15)]">
                <DialogButton type="secondary" onClick={closeDialog}>
                  Cancel
                </DialogButton>
                <DialogButton
                  type="danger"
                  onClick={() => {
                    const itemsToDeleteNow = [...selectedItems];
                    console.log('Bulk delete confirmed for', itemsToDeleteNow.length, 'items', itemsToDeleteNow);
                    deleteSelectedItems(itemsToDeleteNow);
                    closeDialog();
                  }}
                >
                  Delete
                </DialogButton>
              </div>
            </>
          )}
        </Dialog>
      </DialogRoot>
    </>
  );
};
