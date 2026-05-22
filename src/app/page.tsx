import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Kulima - Smart Farm Management
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            African AgriTech platform for farm management, soil health monitoring,
            disease detection, and weather tracking.
          </p>

          <div className="flex gap-4 justify-center">
            <Link
              href="/auth/signin"
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="px-6 py-3 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center p-6 bg-white rounded-lg shadow">
            <div className="text-3xl mb-2">🌾</div>
            <h3 className="font-semibold text-lg mb-2">Farm Management</h3>
            <p className="text-gray-600 text-sm">
              Create and manage multiple farms with ease
            </p>
          </div>

          <div className="text-center p-6 bg-white rounded-lg shadow">
            <div className="text-3xl mb-2">🧪</div>
            <h3 className="font-semibold text-lg mb-2">Soil Health</h3>
            <p className="text-gray-600 text-sm">
              Track soil nutrients and pH levels
            </p>
          </div>

          <div className="text-center p-6 bg-white rounded-lg shadow">
            <div className="text-3xl mb-2">🔍</div>
            <h3 className="font-semibold text-lg mb-2">Disease Detection</h3>
            <p className="text-gray-600 text-sm">
              Upload crop images for disease identification
            </p>
          </div>

          <div className="text-center p-6 bg-white rounded-lg shadow">
            <div className="text-3xl mb-2">🌤️</div>
            <h3 className="font-semibold text-lg mb-2">Weather Tracking</h3>
            <p className="text-gray-600 text-sm">
              Log and analyze weather conditions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}