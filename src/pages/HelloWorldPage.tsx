import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const HelloWorldPage: React.FC = () => {
  const [greeting, setGreeting] = useState('Hello, World!');
  // Do not force a light background — allow the site's background to show through unless a user sets one
  const [backgroundColor, setBackgroundColor] = useState<string | undefined>(undefined);
  const [textColor, setTextColor] = useState<string | undefined>(undefined);
  const [fontSize, setFontSize] = useState(24);

  // Load configuration from localStorage (in a real plugin, this would come from the server)
  useEffect(() => {
    const savedGreeting = localStorage.getItem('helloworld-greeting');
    const savedBgColor = localStorage.getItem('helloworld-bg-color');
    const savedTextColor = localStorage.getItem('helloworld-text-color');
    const savedFontSize = localStorage.getItem('helloworld-font-size');

    if (savedGreeting) setGreeting(savedGreeting);
    if (savedBgColor) setBackgroundColor(savedBgColor);
    if (savedTextColor) setTextColor(savedTextColor);
    if (savedFontSize) setFontSize(parseInt(savedFontSize));
  }, []);

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div
          className="rounded-lg shadow-lg p-8 text-center"
          style={{
            ...(backgroundColor ? { backgroundColor } : {}),
            ...(textColor ? { color: textColor } : {}),
            fontSize: `${fontSize}px`,
            minHeight: '300px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <h1 className="font-bold mb-4" style={{ fontSize: `${fontSize + 8}px` }}>
            {greeting}
          </h1>
          <p className="mb-6 opacity-80">
            Welcome to the Hello World plugin! This greeting is fully customizable.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2">
              <strong>Plugin ID:</strong> helloworld
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2">
              <strong>Version:</strong> 0.1.0
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2">
              <strong>Author:</strong> dzutech
            </div>
          </div>
          <div className="mt-6 text-sm opacity-60">
            <p>
              Configure this page in the{' '}
              <Link to="/admin/helloworld" className="underline hover:opacity-80">
                admin panel
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-8 grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Features</h2>
            <ul className="space-y-2 text-gray-600">
              <li>✅ Customizable greeting text</li>
              <li>✅ Adjustable colors and styling</li>
              <li>✅ Configurable font size</li>
              <li>✅ Admin configuration panel</li>
              <li>✅ Persistent settings</li>
            </ul>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                to="/admin/helloworld"
                className="block w-full bg-blue-600 text-white text-center py-2 px-4 rounded hover:bg-blue-700 transition-colors"
              >
                Configure Plugin
              </Link>
              <Link
                to="/admin/plugins"
                className="block w-full bg-gray-600 text-white text-center py-2 px-4 rounded hover:bg-gray-700 transition-colors"
              >
                Manage Plugins
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelloWorldPage;
