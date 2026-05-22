import { useEffect } from "react";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useCook } from "@/stores/useCook";

export default function Share() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const openCook = useCook((s) => s.openCook);
    const closeCook = useCook((s) => s.closeCook);

    useEffect(() => {
        if (!id) return;

        useCook.getState().openCook(parseInt(id));
    }, [id]);

    return <Redirect href="/" />;
}