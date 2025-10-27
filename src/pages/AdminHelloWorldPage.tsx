import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const AdminHelloWorldPage: React.FC = () => {
  const [greeting, setGreeting] = useState('Hello, World!');
  // Don't force a light background in admin preview; let the site's admin layout determine the page background
  const [backgroundColor, setBackgroundColor] = useState<string | undefined>(undefined);
  const [textColor, setTextColor] = useState<string | undefined>(undefined);
  const [fontSize, setFontSize] = useState(24);
  const [isSaved, setIsSaved] = useState(false);

  // Load current configuration
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

  const handleSave = () => {
    localStorage.setItem('helloworld-greeting', greeting);
    localStorage.setItem('helloworld-bg-color', backgroundColor ?? '');
    localStorage.setItem('helloworld-text-color', textColor ?? '');
    localStorage.setItem('helloworld-font-size', fontSize.toString());
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleReset = () => {
    setGreeting('Hello, World!');
    // Don't force light colors in the admin preview — let the admin layout
    // determine the background by default. Clearing the colors allows the
    // preview to inherit the site's admin styles.
    setBackgroundColor(undefined);
    setTextColor(undefined);
    setFontSize(24);
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="rounded-lg shadow-lg p-8 bg-slate-900/50 border border-slate-800/60">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-100 mb-2">
              Hello World Plugin Configuration
            </h1>
            <p className="text-slate-400">
              Customize the appearance and content of your Hello World page.
            </p>
          </div>

          {isSaved && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">Settings saved successfully!</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-8">
            {/* Greeting Text */}
            <div>
              <label htmlFor="greeting" className="block text-sm font-medium text-slate-200 mb-2">
                Greeting Text
              </label>
              <input
                type="text"
                id="greeting"
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-800/60 bg-slate-900/50 text-sm text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your greeting"
              />
              <p className="mt-1 text-sm text-slate-400">
                The main greeting displayed on the Hello World page.
              </p>
            </div>

            {/* Font Size */}
            <div>
              <label htmlFor="fontSize" className="block text-sm font-medium text-slate-200 mb-2">
                Font Size (px)
              </label>
              <input
                type="range"
                id="fontSize"
                min="16"
                max="48"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-800/30 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-sm text-slate-400 mt-1">
                <span>16px</span>
                <span className="font-medium">{fontSize}px</span>
                <span>48px</span>
              </div>
            </div>

            {/* Colors */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="backgroundColor"
                  className="block text-sm font-medium text-slate-200 mb-2"
                >
                  Background Color
                </label>
                <div className="flex space-x-2">
                  <input
                    type="color"
                    id="backgroundColor"
                    value={backgroundColor ?? ''}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-12 h-10 border border-slate-800/60 rounded cursor-pointer bg-slate-900/50"
                  />
                  <input
                    type="text"
                    value={backgroundColor ?? ''}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="flex-1 px-3 py-2 rounded border border-slate-800/60 bg-slate-900/50 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-200"
                    placeholder="#f8fafc"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="textColor"
                  className="block text-sm font-medium text-slate-200 mb-2"
                >
                  Text Color
                </label>
                <div className="flex space-x-2">
                  <input
                    type="color"
                    id="textColor"
                    value={textColor ?? ''}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-12 h-10 border border-slate-800/60 rounded cursor-pointer bg-slate-900/50"
                  />
                  <input
                    type="text"
                    value={textColor ?? ''}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="flex-1 px-3 py-2 rounded border border-slate-800/60 bg-slate-900/50 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-200"
                    placeholder="#1f2937"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div>
              <h3 className="text-lg font-medium text-slate-100 mb-4">Preview</h3>
              <div
                className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center"
                style={{
                  ...(backgroundColor ? { backgroundColor } : {}),
                  ...(textColor ? { color: textColor } : {}),
                  fontSize: `${fontSize}px`,
                  minHeight: '150px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: `${fontSize + 8}px`, fontWeight: 'bold' }}>
                  {greeting}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4 pt-6 border-t border-gray-200">
              <button
                onClick={handleSave}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={handleReset}
                className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
              >
                Reset to Defaults
              </button>
              <Link
                to="/helloworld"
                className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors inline-block text-center"
              >
                View Public Page
              </Link>
            </div>
          </div>

          {/* Plugin Info */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <h3 className="text-lg font-medium text-slate-100 mb-4">Plugin Information</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="bg-slate-800/40 rounded-lg p-4">
                <div className="font-medium text-slate-100">Plugin ID</div>
                <div className="text-slate-400">helloworld</div>
              </div>
              <div className="bg-slate-800/40 rounded-lg p-4">
                <div className="font-medium text-slate-100">Version</div>
                <div className="text-slate-400">0.1.0</div>
              </div>
              <div className="bg-slate-800/40 rounded-lg p-4">
                <div className="font-medium text-slate-100">Status</div>
                <div className="text-green-500 font-medium">Active</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHelloWorldPage;
