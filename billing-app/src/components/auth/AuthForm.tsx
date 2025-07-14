"use client";

import { useState } from 'react';
import SignIn from './SignIn';
import SignUp from './SignUp';
import Image from 'next/image';

export default function AuthForm() {
  const [isSignIn, setIsSignIn] = useState(true);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Left side: Image/Logo */}
          <div className="md:w-1/2 bg-indigo-700 text-white p-12 flex flex-col justify-center items-center">
            <div className="mb-8">
              <Image 
                src="/vercel.svg" 
                alt="Logo" 
                width={180} 
                height={60} 
                className="w-auto h-auto" 
              />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-6 text-center">Shivansh Inks Billing System</h2>
            <p className="text-indigo-200 text-center">
              Manage your invoices, statements, and reports all in one place.
            </p>
          </div>
          
          {/* Right side: Auth Form */}
          <div className="md:w-1/2 p-12">
            {isSignIn ? <SignIn /> : <SignUp />}
            
            {/* Toggle between sign in and sign up */}
            <div className="mt-6 text-center">
              <button 
                onClick={() => setIsSignIn(!isSignIn)}
                className="font-medium text-indigo-600 hover:text-indigo-500 focus:outline-none"
              >
                {isSignIn 
                  ? "Don't have an account? Sign up" 
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
