import { useAuth } from './use-auth';

export const AuthButton = () => {
  const auth = useAuth();

  return (
    <>
      {auth.user ? (
        <>
          <span>Account ({auth.user?.attributes?.email})</span>
          <button onClick={() => auth.signOut()}>Sign out</button>
        </>
      ) : (
        <button onClick={() => auth.signIn()}>Sign In / Sign Up</button>
      )}
    </>
  );
};
