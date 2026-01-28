"use client";
import { useUser } from "../../utils/user";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedLayout({
    children,
} : {
    children: React.ReactNode;
}) {
    const { user, loading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
        router.replace("/");
        }
    }, [user, loading, router]);

    if (loading || !user) return null;

    return <>{children}</>;
}
