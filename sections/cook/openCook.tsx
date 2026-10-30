import { useSlidingOverlay } from "@/stores/useSlideOverlay";
import { useFeed } from "@/stores/useFeed";
import { useCook } from "@/stores/useCook";
import { CookMainScreen } from "@/sections/cook";

export const openCookOverlay = (
  post_id: number,
  opts?: { dark?: boolean; onDismiss?: () => void }
) => {
  const overlayId = useSlidingOverlay.getState().openSlidingOverlay(
    <CookMainScreen
      post_id={Number(post_id)}
      dark={opts?.dark}
      onClose={() => useSlidingOverlay.getState().closeSlidingOverlay()}
    />,
    {
      onDismiss: () => {
        useFeed.getState().clearSelectedPost();
        useCook.getState().closeCook();
        opts?.onDismiss?.();
      },
    }
  );

  if (overlayId) useCook.getState().openCook(post_id);

  return overlayId;
};