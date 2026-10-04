import React from 'react';
import { GoogleLogin } from '@react-oauth/google';

interface GoogleAuthButtonProps {
  onSuccess: (credential: string) => Promise<void> | void;
  onError: (errorMessage: string) => void;
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  disabled?: boolean;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  onSuccess,
  onError,
  text = 'signin_with',
  disabled = false,
}) => {
  return (
    <div className={`w-full flex justify-center ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
      <GoogleLogin
        onSuccess={(credentialResponse) => {
          if (credentialResponse.credential) {
            onSuccess(credentialResponse.credential);
          } else {
            onError('No credentials received from Google.');
          }
        }}
        onError={() => {
          onError('Google sign-in was cancelled or failed.');
        }}
        text={text}
        shape="rectangular"
        theme="outline"
        size="large"
        width="380"
        useOneTap={false}
      />
    </div>
  );
};
