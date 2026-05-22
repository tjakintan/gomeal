import { User, Avatar } from "@/types/user.types";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

type UserStore = {
  user: User | null;
  setUser: (user: User) => void;
  clearUser: () => void;
  updateUser: (fields: Partial<User>) => void;
  setAvatar: (config: Avatar) => void;
  updateAvatar: (fields: Partial<Avatar>) => void;
  updateTrait: (trait: keyof Omit<Avatar, "style" | "seed">, value: string | number | undefined) => void;
  clearAvatar: () => void;
};

export const useUser = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
      updateUser: (fields) => set((s) => s.user ? { user: { ...s.user, ...fields } } : s),
      setAvatar: (config) => set((s) => s.user ? { user: { ...s.user, avatar: config } } : s),
      updateAvatar: (fields) =>
        set((s) => s.user?.avatar
          ? { user: { ...s.user, avatar: { ...s.user.avatar, ...fields } } }
          : s
        ),
      updateTrait: (trait, value) =>
        set((s) => s.user?.avatar
          ? { user: { ...s.user, avatar: { ...s.user.avatar, [trait]: value } } }
          : s
        ),
      clearAvatar: () =>  set((s) => s.user ? { user: { ...s.user, avatar: undefined } } : s),
    }),
    {
      name: "user",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ user: s.user }),
    }
  )
);