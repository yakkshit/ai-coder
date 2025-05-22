'use client';

import type React from 'react';
import type { Template } from '~/types/template';
import { STARTER_TEMPLATES } from '~/utils/constants';
import { motion } from 'framer-motion';

interface FrameworkLinkProps {
  template: Template;
}

const FrameworkLink: React.FC<FrameworkLinkProps> = ({ template }) => (
  <motion.a
    href={`/git?url=https://github.com/${template.githubRepo}.git`}
    data-state="closed"
    data-discover="true"
    className="items-center justify-center"
    whileHover={{ scale: 1.2 }}
    whileTap={{ scale: 0.9 }}
  >
    <div
      className={`inline-block ${template.icon} w-10 h-10 text-4xl transition-all opacity-40 hover:opacity-100 hover:text-lime-500 dark:text-white dark:opacity-60 dark:hover:opacity-100 dark:hover:text-lime-400`}
      title={template.label}
    />
  </motion.a>
);

const StarterTemplates: React.FC = () => {
  return (
    <motion.div
      className="flex flex-col items-center gap-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <span className="text-sm text-gray-500 dark:text-gray-400">or start a blank app with your favorite stack</span>
      <motion.div
        className="flex justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div className="flex flex-wrap justify-center items-center gap-6 max-w-sm">
          {STARTER_TEMPLATES.map((template, index) => (
            <motion.div
              key={template.name}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * index, duration: 0.3 }}
            >
              <FrameworkLink template={template} />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default StarterTemplates;
