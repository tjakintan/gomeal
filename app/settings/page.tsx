"use client";
import { useRef, useEffect, useState, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import "../../styles/pages_style.css";
import { motion } from "framer-motion";
import { useUser } from "../../utils/user";
import { useSignOut, getUserSub } from "../../utils/auth";
import useDarkMode from "../../hooks/useDarkMode";

interface HeaderProps {
    settingsOpen?: boolean;
    passToHeadClick?: () => void;
}
interface SettingsProps {
    isOpen: boolean;
    toggleOpen: () => void;
}
interface MenuButtonProps {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}

function MenuButton({ label, icon, onClick }: MenuButtonProps) {

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-row items-center justify-center space-x-3 
                 px-5 py-2 backdrop-blur-xl rounded-[20px] bg-white
                 font-thin tracking-wide text-black 
                hover:bg-gray-50 transition cursor-pointer"
    >
      {icon}
      <span>
        {label}
      </span>
    </motion.button>
  );
}

function Header({ settingsOpen, passToHeadClick }: HeaderProps) {

    const router = useRouter();
    const pathname = usePathname();

    const { user } = useUser();
    const [showSignInUpPage, setShowSignInUpPage] = useState(false);
    const [showProfilePage, setShowProfilePage] = useState(false);
    const [profilePos, setProfilePos] = useState({ top: 0, left: 0 });
    const userButtonRef = useRef<HTMLDivElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const homeRef = useRef<HTMLDivElement | null>(null);
    const discoverRef = useRef<HTMLDivElement | null>(null);
    const uploadRef = useRef<HTMLDivElement | null>(null);
    const navRefs = [homeRef, discoverRef, uploadRef];
    const [activeIndex, setActiveIndex] = useState(0);
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);
    
    const [positions, setPositions] = useState([
        { left: 0, width: 0 },
        { left: 0, width: 0 },
        { left: 0, width: 0 },
    ]);
    
    const measurePositions = () => {
        if (!containerRef.current) return;

        const containerRect = containerRef.current.getBoundingClientRect();

        const newPositions = navRefs.map((ref) => {
            const rect = ref.current?.getBoundingClientRect();
            if (!rect) return { width: 0, left: 0 };

            const left = rect.left - containerRect.left; 
            const width = rect.width;

            return { width, left };
        });

        setPositions(newPositions);
    };
    
    useEffect(() => {
        measurePositions();
        window.addEventListener("resize", measurePositions);
        return () => window.removeEventListener("resize", measurePositions);
    }, []);

    useEffect(() => {
        if (pathname === "/feed") setActiveIndex(0);
        else if (pathname === "/discover") setActiveIndex(1);
        else if (pathname === "/upload") setActiveIndex(2);
    }, [pathname]);
    
    const displayIndex = hoverIndex !== null ? hoverIndex : activeIndex;

    const openProfile = () => {
        if (userButtonRef.current) {
        const rect = userButtonRef.current.getBoundingClientRect();
        setProfilePos({
            top: rect.bottom + 5, 
            left: rect.right - 300, 
        });
        setShowProfilePage(true);
        }
    };

    useEffect(() => {
        if (showSignInUpPage || showProfilePage) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
        return () => {
            document.body.style.overflow = "auto";
        };
    }, [showSignInUpPage, showProfilePage]);

    return (
        <>

            <div className={`px-2 py-1 w-full flex items-center justify-between `}>

                {/* goMeal Icon and link to home */}
                <Link href="/" className="flex items-center">
                    <img
                        src="/gomeal.png"
                        className="w-12 h-12 object-contain"
                        alt="GoMeal"
                    />
                </Link>

                {/* user specified actions */}
                <div ref={containerRef} className={`flex py-3 gap-5 bg-black/5 backdrop-blur-xl
                            rounded-[30px] shadow-md overflow-hidden ${user ? "pointer-events-auto opacity-100" : "opacity-50 pointer-event-none"}`}>

                    {user && positions[displayIndex]?.width > 0 && (
                        <motion.div
                        className={`absolute inset-0 bg-black rounded-full`}
                        animate={{
                            width: positions[displayIndex].width,
                            x: positions[displayIndex].left,
                        }}
                        transition={{ type: "spring", stiffness: 500, damping: 35 }}
                        />
                    )}

                    {[
                        { label: "Feed", to: "/feed", ref: homeRef, index: 0 },
                        { label: "Discover", to: "/discover", ref: discoverRef, index: 1 },
                        { label: "Post", to: "/post", ref: uploadRef, index: 2 },
                    ].map((item) => (
                        <div key={item.to} ref={item.ref} className={`${user ? (displayIndex === item.index ? "text-white" : "text-black") : "text-black"}`}>
                            
                            {user ? (
                                <Link
                                    key={item.to}
                                    href={item.to}
                                    className={`relative z-10 text-sm px-4 font-extralight tracking-wider`}
                                    onMouseEnter={() => setHoverIndex(item.index)}
                                    onMouseLeave={() => setHoverIndex(null)}
                                >
                                    {item.label}
                                </Link>
                            ) : (
                                <div
                                    key={item.to}
                                    ref={item.ref}
                                    className={`relative z-10 text-sm px-4 font-extralight tracking-wider opacity-50 cursor-default`}
                                    onClick={() => setShowSignInUpPage(true)}
                                >
                                    {item.label}
                                </div>
                            )}
                            
                        </div>
                    ))}
                    
                </div>

                {/* links to settings & authenticate/showProfile //flex-col md:flex-row */}
                <div className="flex flex-row gap-5 py-2">

                    {/* if not user show signUpIn Page */}
                    {!user && (
                        <button
                            onClick={() => {setShowSignInUpPage(true)}}
                            className="cursor-pointer flex items-center justify-center px-1"
                        >
                            <svg viewBox="0 0 1664 1664" className="w-5 h-5">
                                <path
                                fill="currentColor"
                                d="M832 0Q673 0 560.5 112.5T448 384t112.5 271.5T832 768t271.5-112.5T1216 384t-112.5-271.5T832 0zm0 896q112 0 227 22t224 69.5t193.5 114t136 162.5t51.5 208q0 75-57 133.5t-135 58.5H192q-78 0-135-58.5T0 1472q0-112 51.5-208t136-162.5t193.5-114T605 918t227-22z"
                                />
                            </svg>
                        </button>
                    )}

                    {/* Settings Button */}
                    <button className="flex cursor-pointer items-center justify-center px-1" onClick={passToHeadClick}>
                        <svg viewBox="0 0 42 42" className="w-6 h-6">
                            <path
                                fill="currentColor"
                                d="M6.62 24.5c.4 1.62 1.06 3.13 1.93 4.49l-2.43 2.44c-1.09 1.09-1.08 1.74-.12 2.7l2.37 2.37c.97.971 1.63.95 2.7-.12l2.55-2.56c1.2.688 2.5 1.22 3.88 1.56v3.12c0 1.55.47 2 1.82 2h3.36c1.37 0 1.82-.48 1.82-2v-3.12c1.38-.34 2.68-.87 3.88-1.56l2.61 2.619c1.08 1.068 1.729 1.09 2.699.131l2.381-2.381c.949-.949.97-1.602-.131-2.699l-2.5-2.5a14.665 14.665 0 0 0 1.938-4.49h3.302c1.368 0 1.818-.48 1.818-2v-3c0-1.48-.393-2-1.818-2h-3.302c-.34-1.38-.87-2.68-1.562-3.88l2.382-2.37c1.05-1.05 1.14-1.7.13-2.7l-2.38-2.38c-.95-.95-1.632-.94-2.7.13l-2.26 2.25A14.946 14.946 0 0 0 24.5 6.62V3.5c0-1.48-.391-2-1.82-2h-3.36c-1.35 0-1.82.49-1.82 2v3.12c-1.62.4-3.13 1.06-4.49 1.93L10.75 6.3C9.68 5.23 9 5.22 8.05 6.17L5.67 8.55c-1.01 1-.92 1.65.13 2.7l2.37 2.37c-.68 1.2-1.21 2.5-1.55 3.88h-3.3c-1.35 0-1.82.49-1.82 2v3c0 1.55.47 2 1.82 2h3.3zm8.66-3.5c0-3.16 2.56-5.72 5.72-5.72s5.721 2.56 5.721 5.72a5.72 5.72 0 1 1-11.441 0z"
                            />
                        </svg>
                    </button>

                </div>

            </div>

            {showSignInUpPage &&  (
                <>
                <div
                    className="fixed inset-0 backdrop-blur-sm z-40"
                    onClick={() => setShowSignInUpPage(false)}
                />
                <div
                    className="fixed top-1/2 left-1/2 isolate w-full md:w-2/3 lg:w-2/3
                            -translate-x-1/2 -translate-y-1/2 z-50
                            flex flex-col justify-center items-center gap-4 p-5 font-thin"
                >
                    <span className="tracking-wider">You’re almost there</span>
                    <h1 className="text-center text-sm">Get to save recipes, upload dishes, and personalize your feed</h1>
                    <motion.button 
                        whileHover={{ scale: 1.05 }} 
                        transition={{ type: "spring", stiffness: 300, damping: 20 }} 
                        className="w-11/12 md:w-1/3 lg:w-1/3 p-3 rounded-[30px] bg-black outline-2 outline-black text-white text-start cursor-pointer tracking-wider rounded-l-none"
                        onClick={() => {setShowSignInUpPage(false);router.push("/auth?mode=signup")}}
                    >sign Up
                    </motion.button>
                    <motion.button 
                        whileHover={{ scale: 1.05 }} 
                        transition={{ type: "spring", stiffness: 300, damping: 20 }} 
                        className="w-11/12 md:w-1/3 lg:w-1/3 p-3 rounded-[30px] bg-white outline-2 cursor-pointer tracking-wider text-start rounded-l-none"
                        onClick={() => {setShowSignInUpPage(false);router.push("/auth?mode=signin")}}
                    >sign In
                    </motion.button>
                </div>
                </>
            )}

        </>
    );
}

export default function Settings({ isOpen, toggleOpen }: SettingsProps) {


    const isOpenHeader = isOpen;
    const toggleOpenHeader = toggleOpen;

    const { user, setUser, loading } = useUser();
    const signout = useSignOut();
    const [isDark, setIsDark] = useDarkMode();
    const [isLoading, setIsLoading] = useState(false);
    const [showAccountUpdateSection, setShowAccountUpdateSection] = useState(false);
    const [showSignUpInPage, setShowSignUpInPage] = useState(false);
    const [showPostSection, setShowPostSection] = useState(false);
    const [showLikeSection, setShowLikeSection] = useState(false);
    const [showInboxSection, setShowInboxSection] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const profile_img = useRef<string | null>(null);

    const callAction = async (actionName: string, payload = {}) => {

        if (isLoading) return;
        setIsLoading(true);

        const sub = getUserSub(user);

        if (!sub) {
            console.error("No user speciied")
        }

        try {
            const res = await fetch(
                "https://api.gomeal.org/actions",
                {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({
                        action: actionName,
                        user_sub: sub,
                        ...payload, 
                    }),
                }
            );

            const data = await res.json();
            console.log("API Response:", data);

            return data;
        } catch (err) {
            console.error("API error:", err);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignOut = () => {
        signout();
    }

    const handleDeleteAccount = async() => {

        const result = await callAction("delete_user_account");

        if (result?.status === "success") {
            handleSignOut();
        } else {
            console.error("Failed to delete account:", result);
        }
    };

    const handleUpdateAccount = async () => {

    };

    const handleGetLikedPosts = async () => {
        console.log("get_user_liked_post");

        const result = await callAction("get_user_liked_post");

        if (result?.status === "success") {
        }
    };

    const handleGetUserPosts = async () => {
        console.log("get_user_posts");

        const result = await callAction("get_user_posts");

        if (result?.status === "success") {
        }
    };

    const handleGetUserInbox = async () => {

    }

    useEffect(() => {
        if (!isOpen) {
            setShowAccountUpdateSection(false);
            setShowDeleteConfirm(false);
            setShowSignUpInPage(false);
        }
    }, [isOpen]);

    return (
        <div className={`flex flex-col items-center justify-between`}>

            <div className={`w-full md:max-w-2/3 flex items-center px-1
                            ${isOpen ? "h-[40vh]" : "hidden"}  
                            ${showAccountUpdateSection ? "h-[75vh]" : ""}`}>
                
                <div className={`overflow-hidden w-full flex flex-col items-center gap-5 justify-between ${showAccountUpdateSection ? "hidden" : ""}`}>

                    <div className="w-full flex flex-col h-2/5 bg-red-300">
                        <div className="w-full flex gap-2">
                            <svg 
                                className="w-7 h-7"
                                viewBox="0 0 16 16"
                            >
                                <path fill="#000000" fillRule="evenodd" d="m14.489 8.388l-.001.006a.115.115 0 0 1-.027.028a.428.428 0 0 1-.264.082h-3.186c-3.118 0-4.68 3.77-2.476 5.974a6.5 6.5 0 1 1 5.953-6.09Zm-.292 1.616c.913 0 1.736-.618 1.79-1.529a8 8 0 1 0-7.032 7.468c1.243-.147 1.527-1.639.641-2.525c-1.26-1.26-.367-3.414 1.415-3.414h3.186ZM10 5a1 1 0 1 1-2 0a1 1 0 0 1 2 0ZM6 7a1 1 0 1 0 0-2a1 1 0 0 0 0 2Zm0 2a1 1 0 1 1-2 0a1 1 0 0 1 2 0Z" clipRule="evenodd"
                                />
                            </svg>
                        </div>
                        <div className="">
                            <button
                                className="px-4 py-2 rounded-xl text-sm tracking-widest
                                            bg-black text-white dark:bg-white dark:text-black
                                            transition-all"
                            >
                            {isDark ? "LIGHT" : "DARK"}
                            </button>
                        </div>

                    </div>

                    {/* user specified actions */}
                    <div className="w-full flex flex-col gap-3 bg-red-300 overflow-x-auto">

                        <div className="flex p-1 gap-2 bg-green-300 items-start">

                            <div className={`w-8 h-8 rounded-full outline-1 overflow-hidden relative`}
                            >
                                {user?.profile_img_url && (
                                    <img
                                        src={user.profile_img_url}
                                        alt="profile"
                                        className="absolute w-full h-full object-cover"
                                    />
                                )}
                            </div>
                            <span className="text-[18px] mt-2 font-extralight text-black">
                                {user?.profile_name || "default"}
                            </span>

                        </div>

                        <div  
                            className={`${user ? "" : "opacity-30 pointer-events-none"} bg-blue-300
                                        flex flex-row justify-start items-start gap-5 p-1 overflow-x-auto scrollbar-hide`}>

                            {/* GET user post */}
                            <MenuButton
                                label="Post"
                                icon={
                                    <svg
                                        viewBox="0 0 24 24" 
                                        fill="#000000"
                                        className="w-7 h-7"
                                    >
                                        <g fill="#000000"><path d="M5 1.25a.75.75 0 0 1 .75.75v.5c0 .966.784 1.75 1.75 1.75h9a1.75 1.75 0 0 0 1.75-1.75V2a.75.75 0 0 1 1.5 0v.5a3.25 3.25 0 0 1-3.25 3.25h-9A3.25 3.25 0 0 1 4.25 2.5V2A.75.75 0 0 1 5 1.25Z"/><path fillRule="evenodd" d="M8.948 6.75h6.104c.899 0 1.648 0 2.242.08c.628.084 1.195.27 1.65.725c.456.456.642 1.023.726 1.65c.08.595.08 1.345.08 2.243v1.104c0 .899 0 1.648-.08 2.242c-.084.628-.27 1.195-.726 1.65c-.455.456-1.022.642-1.65.726c-.594.08-1.344.08-2.242.08H8.948c-.898 0-1.648 0-2.242-.08c-.628-.084-1.195-.27-1.65-.726c-.456-.455-.642-1.022-.726-1.65c-.08-.594-.08-1.344-.08-2.242v-1.104c0-.899 0-1.648.08-2.242c.084-.628.27-1.195.725-1.65c.456-.456 1.023-.642 1.65-.726c.595-.08 1.345-.08 2.243-.08ZM6.905 8.317c-.461.062-.659.169-.789.3c-.13.13-.237.327-.3.788c-.064.483-.066 1.131-.066 2.095v1c0 .964.002 1.612.067 2.095c.062.461.169.659.3.789c.13.13.327.237.788.3c.483.064 1.131.066 2.095.066h6c.964 0 1.612-.002 2.095-.066c.461-.063.659-.17.789-.3c.13-.13.237-.328.3-.79c.064-.482.066-1.13.066-2.094v-1c0-.964-.002-1.612-.067-2.095c-.062-.461-.169-.659-.3-.789c-.13-.13-.327-.237-.788-.3c-.483-.064-1.131-.066-2.095-.066H9c-.964 0-1.612.002-2.095.067Z" clipRule="evenodd"/><path d="M7.5 18.25a3.25 3.25 0 0 0-3.25 3.25v.5a.75.75 0 0 0 1.5 0v-.5c0-.966.784-1.75 1.75-1.75h9c.966 0 1.75.784 1.75 1.75v.5a.75.75 0 0 0 1.5 0v-.5a3.25 3.25 0 0 0-3.25-3.25h-9Z"/></g>
                                    </svg>
                                }
                                onClick={handleGetUserPosts}
                            />

                            {/* GET user likes */}
                            <MenuButton
                                label="Like"
                                icon={
                                    <svg
                                        viewBox="0 0 24 24"
                                        className="w-7 h-7"
                                    >
                                        <g fill="none"><path stroke="#000000" strokeLinecap="round" strokeWidth="1.5" d="M22 12c0 4.714 0 7.071-1.465 8.535C19.072 22 16.714 22 12 22s-7.071 0-8.536-1.465C2 19.072 2 16.714 2 12s0-7.071 1.464-8.536C4.93 2 7.286 2 12 2"/><path stroke="#000000" strokeLinecap="round" strokeWidth="1.5" d="m2 12.5l1.752-1.533a2.3 2.3 0 0 1 3.14.105l4.29 4.29a2 2 0 0 0 2.564.222l.299-.21a3 3 0 0 1 3.731.225L21 18.5"/><path fill="#000000" d="m16.06 8.57l.492-.566l-.492.566ZM18 3.968l-.532.529a.75.75 0 0 0 1.064 0L18 3.967Zm1.94 4.602l-.492-.566l.492.566ZM18 9.606v-.75v.75Zm-1.448-1.602c-.486-.422-.952-.895-1.292-1.374c-.347-.49-.51-.914-.51-1.255h-1.5c0 .788.358 1.518.786 2.122c.435.614.999 1.175 1.533 1.639l.983-1.132ZM14.75 5.375c0-.933.42-1.404.834-1.557c.426-.156 1.13-.08 1.884.679l1.064-1.058c-1.045-1.05-2.342-1.442-3.466-1.028c-1.136.418-1.816 1.555-1.816 2.964h1.5Zm5.681 3.761c.534-.464 1.098-1.025 1.533-1.639c.428-.604.786-1.334.786-2.122h-1.5c0 .341-.163.765-.51 1.255c-.34.48-.806.952-1.292 1.374l.983 1.132Zm2.319-3.76c0-1.41-.68-2.547-1.816-2.965c-1.124-.414-2.42-.023-3.466 1.028l1.064 1.058c.755-.76 1.458-.835 1.884-.679c.414.153.834.624.834 1.557h1.5Zm-7.181 3.76c.756.658 1.36 1.22 2.431 1.22v-1.5c-.424 0-.615-.129-1.448-.852l-.983 1.132Zm3.879-1.132c-.833.723-1.024.852-1.448.852v1.5c1.071 0 1.675-.562 2.431-1.22l-.983-1.132Z"/></g>
                                    </svg>
                                }
                                onClick={handleGetLikedPosts}
                            /> 
                            
                            {/* GET user inbox */}
                            <MenuButton
                                label="Inbox"
                                icon={
                                    <svg 
                                        viewBox="0 0 20 20"
                                        className="w-7 h-7"
                                    >
                                        <path fill="#000000" d="M16.157 0c.378 0 .842.372 1.035.83L20 7.439V18a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V7.438L2.808.831C3 .372 3.465 0 3.843 0ZM6.741 8.838H1.4V18a.6.6 0 0 0 .6.6h16a.6.6 0 0 0 .6-.6V8.838h-4.341a3.902 3.902 0 0 1-7.518 0ZM15.913 1.4H4.087L1.52 7.438h6.505a2.5 2.5 0 1 0 4.95 0h5.505L15.913 1.4Z"/>
                                    </svg>
                                }
                                onClick={handleGetUserInbox}
                            />

                            {/* update user account */}
                            <MenuButton
                                label="update"
                                icon={
                                    <svg 
                                        className="w-6 h-6" 
                                        viewBox="0 0 15 15">
                                            <path fill="#000000" fillRule="evenodd" d="M1.903 7.297c0 3.044 2.207 5.118 4.686 5.547a.521.521 0 1 1-.178 1.027C3.5 13.367.861 10.913.861 7.297c0-1.537.699-2.745 1.515-3.663c.585-.658 1.254-1.193 1.792-1.602H2.532a.5.5 0 0 1 0-1h3a.5.5 0 0 1 .5.5v3a.5.5 0 0 1-1 0V2.686l-.001.002c-.572.43-1.27.957-1.875 1.638c-.715.804-1.253 1.776-1.253 2.97Zm11.108.406c0-3.012-2.16-5.073-4.607-5.533a.521.521 0 1 1 .192-1.024c2.874.54 5.457 2.98 5.457 6.557c0 1.537-.699 2.744-1.515 3.663c-.585.658-1.254 1.193-1.792 1.602h1.636a.5.5 0 1 1 0 1h-3a.5.5 0 0 1-.5-.5v-3a.5.5 0 1 1 1 0v1.845h.002c.571-.432 1.27-.958 1.874-1.64c.715-.803 1.253-1.775 1.253-2.97Z" clipRule="evenodd"/>
                                    </svg>
                                }
                                onClick={() => {
                                    setShowAccountUpdateSection(true);
                                    setPreviewUrl(user?.profile_img_url || null);
                                }}
                            /> 

                            {/* sign out */}
                            <MenuButton
                                label="signout"
                                icon={
                                    <svg 
                                        className="w-6 h-6" 
                                        viewBox="0 0 16 17">
                                        <path fillRule="evenodd" d="M12 9V7H8V5h4V3l4 3l-4 3zm-2 3H6V3L2 1h8v3h1V1c0-.55-.45-1-1-1H1C.45 0 0 .45 0 1v11.38c0 .39.22.73.55.91L6 16.01V13h4c.55 0 1-.45 1-1V8h-1v4z" fill="#000000"/>
                                    </svg>
                                }
                                onClick={handleSignOut}
                            />

                            {/* Delete */}
                            <MenuButton
                                label="delete"
                                icon={
                                    <svg 
                                        className="w-6 h-6" 
                                        viewBox="0 0 1025 1024"
                                        >
                                            <path fill="rgb(229, 4, 4)" d="M960.865 192h-896q-26 0-45-18.5t-19-45t18.5-45.5t45.5-19h320q0-26 18.5-45t45.5-19h128q27 0 45.5 19t18.5 45h320q26 0 45 19t19 45.5t-19 45t-45 18.5zm0 704q0 53-37.5 90.5t-90.5 37.5h-640q-53 0-90.5-37.5t-37.5-90.5V256h896v640zm-640-448q0-26-19-45t-45.5-19t-45 19t-18.5 45v384q0 27 18.5 45.5t45 18.5t45.5-18.5t19-45.5V448zm256 0q0-26-19-45t-45.5-19t-45 19t-18.5 45v384q0 27 18.5 45.5t45 18.5t45.5-18.5t19-45.5V448zm256 0q0-26-19-45t-45.5-19t-45 19t-18.5 45v384q0 27 18.5 45.5t45 18.5t45.5-18.5t19-45.5V448z"
                                            />
                                    </svg>
                                }
                                onClick={() => setShowDeleteConfirm(true)}
                            />

                            <span className={`font-thin text-[9px] tracking-widest text-center ${showDeleteConfirm ? "" : "hidden"}`}>
                                Please note that upon <span className="text-[9px] font-bold">Tapping the red circle</span>, all your data will be <span className="text-[10px] font-bold">deleted</span> and retained for 30 days in accordance with our policy. Review our <span className="underline">terms & conditions</span>, for more.
                            </span>

                        </div>

                    </div>

                    <div className="w-2/3 h-1 border-b-1 border-gray-800"></div>

                </div>

                {showAccountUpdateSection && (
                    <>
                        <div
                            className="w-full h-full py-3 gap-5 flex flex-col justify-center items-center"
                        >
                            <motion.div
                                animate={{y: [3,-3]}}
                                transition={{ duration: 1, repeat: Infinity, repeatType: "loop", ease: "easeInOut" }}
                                onClick={() => setShowAccountUpdateSection(false)}
                                className="cursor-pointer flex flex-col justify-center items-center"
                            >           
                                <svg className="w-6 h-6 rotate-180 " viewBox="0 0 24 24">
                                    <g id="evaArrowIosDownwardFill0">
                                        <g id="evaArrowIosDownwardFill1">
                                            <path id="evaArrowIosDownwardFill2" fill="#5a5a5a" d="M12 16a1 1 0 0 1-.64-.23l-6-5a1 1 0 1 1 1.28-1.54L12 13.71l5.36-4.32a1 1 0 0 1 1.41.15a1 1 0 0 1-.14 1.46l-6 4.83A1 1 0 0 1 12 16Z"/>
                                        </g>
                                    </g>
                                </svg>     
                                <span className="tracking-widest text-sm font-thin">settings</span>
                            </motion.div>
                            {/* <UpdateAccount /> */}
                            <div className="flex">
                                
                            </div>
                        </div>
                    </>
                )}

            </div>

            <div className={`w-full flex`}>
                <Header settingsOpen={isOpenHeader} passToHeadClick={toggleOpenHeader}/>
            </div>

        </div>
    );

}
