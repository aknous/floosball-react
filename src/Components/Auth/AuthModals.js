import React, { Fragment, useEffect, useState } from 'react'
import { supabase } from "../../supabase/supabase";
import { Link } from "react-router-dom";
import { XIcon } from '@heroicons/react/solid'

export function AuthModal({ onClose }) {
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [authModal, setAuthModal] = useState(1)
  
    const handleLogin = async (event) => {
      //event.preventDefault()
  
      setLoading(true)
      const { error } = await supabase.auth.signInWithPassword({ email, password })
  
      if (error) {
        alert(error.error_description || error.message)
      } else {
        onClose()
      }
      setLoading(false)
    }
    
    const handleSignUp = async (event) => {
        event.preventDefault()
    
        setLoading(true)
        const { error } = await supabase.auth.signUp({ email, password })
    
        if (error) {
          alert(error.error_description || error.message)
        } else {
          onClose()
        }
        setLoading(false)
      }

    return (
        <div className="flex flex-col pb-2 font-pixel">
            <div className="flex items-center justify-between">
                <div className='w-8 h-8'></div>
                <div className='text-gray-900 text-xl font-medium align-middle justify-self-center'>{authModal === 1 ? "Sign In" : "Create Account"}</div>
                <button
                    className="bg-transparent border-0 text-slate float-right"
                    onClick={() => onClose()}
                >
                    <XIcon className="h-6 w-6 text-gray-900 justify-self-end hover:text-slate-200" aria-hidden="true" />
                </button>
            </div>
            <div className='flex justify-center h-full rounded-lg'>
                <form className='flex flex-col space-y-4 w-2/3 min-w-full items-center mt-6'>
                    <div className="isolate -space-y-px rounded-md shadow-sm w-64">
                        <div className="relative rounded-md rounded-b-none border border-gray-300 px-3 py-2">
                            <input
                                name="email"
                                type="email"
                                placeholder="Email"
                                required={true}
                                onChange={(e) => setEmail(e.target.value)}
                                className={`block w-full border-0 p-0 text-gray-900 placeholder-gray-500 sm:text-sm`}
                            />
                        </div>
                        <div className="relative rounded-md rounded-t-none border border-gray-300 px-3 py-2">
                            <input
                                name="password"
                                type="password"
                                placeholder="Password"
                                required={true}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`block w-full border-0 p-0 text-gray-900 placeholder-gray-500 sm:text-sm`}
                            />
                        </div>
                    </div>
                    <div className='flex space-x-4'>
                        <button
                            type="button"
                            disabled={loading}
                            className="inline-flex items-center rounded-md border border-transparent bg-green-100 px-4 py-2 text-base font-medium text-green-800 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                            onClick={() => {authModal === 1 ? handleLogin() : handleSignUp()}}
                        >
                            {authModal === 1 ? "Sign In" : "Create Account"}
                        </button>
                    </div>
                    <div className='text-gray-900 text-sm font-medium align-middle justify-self-center'>
                        <span className='hover:underline cursor-pointer' onClick={() => {authModal === 1 ? setAuthModal(2) : setAuthModal(1)}}>{authModal === 1 ? "Not signed up yet? Create an account" : "Already have an account? Sign in here"}</span>
                        </div>
                </form>
            </div>
        </div>
    )
}