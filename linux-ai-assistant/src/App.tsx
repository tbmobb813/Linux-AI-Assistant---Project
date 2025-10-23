import { useState, ChangeEvent } from "react";

export default function App(): JSX.Element {
    const [message, setMessage] = useState("");

    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white">
            <header className="p-4 border-b border-gray-700">
                <h1 className="text-2xl font-bold">Linux AI Assistant</h1>
            </header>

            <main className="flex-1 overflow-y-auto p-4">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-gray-800 rounded-lg p-6 mb-4">
                        <p className="text-gray-300">Welcome to your Linux AI Assistant! 🚀</p>
                        <p className="text-gray-400 text-sm mt-2">
                            The application is now running. Start building your features!
                        </p>
                    </div>
                </div>
            </main>

            <footer className="p-4 border-t border-gray-700">
                <div className="max-w-4xl mx-auto flex gap-2">
                    <input
                        type="text"
                        value={message}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium">Send</button>
                </div>
            </footer>
        </div>
    );
}