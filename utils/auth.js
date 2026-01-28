import { useUser } from "./user";

export function getUserSub(user) {
  return user?.sub || null;
}

export function useSignOut() {
  const { setUser, setHasAttemptedAuth } = useUser(); 

  const signout = async () => {
    try {
      await fetch(
        "https://api.gomeal.org/auth/signout",
        {
          method: "POST",
          credentials: "include",
        }
      );
      setUser(null);
      setHasAttemptedAuth(false);
    } catch (err) {
      console.error(err);
    }
  };

  return signout;
}
