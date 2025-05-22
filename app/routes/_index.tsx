import { json, type MetaFunction } from '@remix-run/cloudflare';
import { ClientOnly } from 'remix-utils/client-only';
import { BaseChat } from '~/components/chat/BaseChat';
import { Chat } from '~/components/chat/Chat.client';
import { Header } from '~/components/header/Header';
import BackgroundRays from '~/components/ui/BackgroundRays';

export const meta: MetaFunction = () => {
  return [
    {
      title: 'Lingo AI By Cedzlabs Tools Fullstack Builder Build with Stack Blaze + Bolt.new for blazing fast results!',
    },
    { name: 'description', content: 'Build fullstack apps fast with Cedzlabs Tools using Stack Blaze + Bolt.new.' },
    { name: 'og:title', content: 'Lingo AI by Cedzlabs Tools Fullstack Builder' },
    { name: 'og:description', content: 'Blazing fast results using Stack Blaze + Bolt.new. Try Cedzlabs Tools now!' },
    { name: 'og:image', content: 'https://cedzlabs.com/og-image.jpg' }, // Replace with your actual image URL
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: 'Cedzlabs Tools Fullstack Builder' },
    { name: 'twitter:description', content: 'Cedzlabs Blazing fast results using Stack Blaze + Bolt.new.' },
    { name: 'twitter:image', content: 'https://cedzlabs/og-image.jpg' }, // Replace with your actual image URL
  ];
};

export const loader = () => json({});

/**
 * Landing page component for Bolt
 * Note: Settings functionality should ONLY be accessed through the sidebar menu.
 * Do not add settings button/panel to this landing page as it was intentionally removed
 * to keep the UI clean and consistent with the design system.
 */
export default function Index() {
  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-gray-900">
      <BackgroundRays />
      <Header />
      <ClientOnly fallback={<BaseChat />}>{() => <Chat />}</ClientOnly>
    </div>
  );
}
