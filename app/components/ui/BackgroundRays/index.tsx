import type React from 'react';
import styles from './styles.module.scss';
import { classNames } from '~/utils/classNames';

interface BackgroundRaysProps {
  className?: string;
}

const BackgroundRays: React.FC<BackgroundRaysProps> = ({ className }) => {
  return (
    <div className={classNames(styles.container, className, 'fixed inset-0 -z-10 overflow-hidden')}>
      <div className={classNames(styles.rays, 'lime-gradient opacity-20 dark:opacity-20')} />
    </div>
  );
};

export default BackgroundRays;
