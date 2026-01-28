"use client";
import React, { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    signUpUser,
    handleConfirmUser as cognitoConfirmUser,
    handleResendConfirmationCode as resendConfirmUser
} from "../../utils/cognito";
import {
    dateHandleChange as date_handleChange,
    dateHandleKeyDown as date_handleKeyDown,
    passcodeHandleChange as passcode_handleChange,
    passcodeHandleKeyDown as passcode_handleKeyDown
} from "../../utils/input";
import AuthHeader from "../../hooks/AuthHeader";

interface SignUpPayload {
    first_name: string;
    last_name: string;
    email: string;
    profile_name: string;
    dob: string;
    passcode: string;
    profile_img_base64: string | null;
    sub?: string;
}
interface ConfirmSignUpProps {
    payload: SignUpPayload;
}

export const SignUp: React.FC = () => {

    const payload_inputRefs = {
        user_first_name: useRef<HTMLInputElement>(null),
        user_last_name: useRef<HTMLInputElement>(null),
        signUp_user_email: useRef<HTMLInputElement>(null),
        signUp_confirm_user_email: useRef<HTMLInputElement>(null),
        user_name: useRef<HTMLInputElement>(null),
    };
    const router = useRouter();
    const profile_img = useRef<string | null>(null);
    const passcode_inputRefs = useRef<Array<HTMLInputElement | null>>([]);
    const date_inputRefs = useRef<Array<HTMLInputElement | null>>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const openFilePicker = () => fileInputRef.current?.click();
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [emailInUse, setEmailInUse] = useState(false);
    const [emailNotMatch, setEmailNotMatch] = useState(false);
    const [shake, setShake] = useState(false);
    const [invalidEmail, setInvalidEmail] = useState(false);
    const date_inputs = [
        { id: "month", placeholder: "mm", maxLength: 2 },
        { id: "day", placeholder: "dd", maxLength: 2 },
        { id: "year", placeholder: "yyyy", maxLength: 4 },
    ];

    const sign_up_payload = (): SignUpPayload | null => {
        const [month, day, year] = date_inputRefs.current.map(
            (input) => input?.value || ""
        );
        const dob = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        const first_name = payload_inputRefs.user_first_name.current?.value || "";
        const last_name = payload_inputRefs.user_last_name.current?.value || "";
        const email = payload_inputRefs.signUp_user_email.current?.value || "";
        const confirm_email =
        payload_inputRefs.signUp_confirm_user_email.current?.value || "";

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email) || !emailRegex.test(confirm_email)) {
            setInvalidEmail(true);
            setTimeout(() => setInvalidEmail(false), 1500);
            return null;
        }
        if (email !== confirm_email) {
            setEmailNotMatch(true);
            setTimeout(() => setEmailNotMatch(false), 500);
            return null;
        }

        const profile_name = payload_inputRefs.user_name.current?.value || "";
        const profile_img_base64 = profile_img.current || null;
        const passcode = passcode_inputRefs.current
            .map((input) => input?.value)
            .join("");

        if (!first_name || !last_name || !email || !profile_name || !dob || passcode.length !== 6) {
            setShake(true);
            setTimeout(() => setShake(false), 500);
            return null;
        }

        return {
            first_name,
            last_name,
            email,
            profile_name,
            dob,
            passcode,
            profile_img_base64,
        };
    };

    const handleSignUp = async () => {
        const payload = sign_up_payload();
        if (!payload) return;

        try {
            const { success, sub, error } = await signUpUser(
                payload.email,
                payload.passcode,
                payload.profile_name
            );

            if (success) {
                payload.sub = sub;
                router.push("/auth?mode=confirm");
            } else if (error === "Email already in use") {
                const params = new URLSearchParams({mode: "signin", email: payload.email});
                router.push(`/auth?${params.toString()}`);
            }
        } catch (err) {
            console.error("Network error:", err);
        }
    };
 
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {

        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            const fullBase64 = reader.result as string;
            setImagePreview(fullBase64);
            profile_img.current = fullBase64.split(",")[1];
        };
        reader.readAsDataURL(file);
    };

    return (
        <>

            <div className="fixed inset-0 backdrop-blur-sm z-10"/>

            <div className={`fixed inset-0 z-20 cursor-pointer`} onClick={() => router.push("/")}>

                <div className="flex h-screen p-5 items-center justify-center overflow-y-auto scrollbar-hide">
                    
                    <div className={`max-w-80 px-5 py-1 flex flex-col gap-1 cursor-pointer`} onClick={(e) => e.stopPropagation()}>
                        
                        <div className="flex items-center justify-center">
                                <div className="flex items-center justify-center overflow-hidden">
                                    <AuthHeader />
                                </div>
                            <h1 className="text-[25px] font-thin tracking-wider text-center">Lets get started</h1>
                        </div>

                        {/* SIGN UP pfp*/}
                        <div className={`flex flex-col items-center mb-1`}>    

                            <motion.div 
                                className="w-15 h-15 border-1 rounded-full flex items-center justify-center cursor-pointer overflow-hidden" onClick={openFilePicker}
                                animate={shake ? { x: [-10, 10, -6, 6, -3, 3, 0] } : {}}
                            >
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={fileInputRef}
                                    onChange={handleImageSelect}
                                    className="hidden"
                                />

                                {imagePreview ? ( 
                                    <img
                                        src={imagePreview}
                                        alt="profile"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <svg 
                                        xmlns="http://www.w3.org/2000/svg"  
                                        className="w-10 h-10"
                                        viewBox="0 0 24 24" fill="#000000"
                                    >
                                        <g fill="none" stroke="#000000" strokeWidth="1">
                                            <path strokeLinejoin="round" d="M4 18a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/>
                                            <circle cx="12" cy="7" r="3"/>
                                        </g>
                                    </svg>
                                )}
                            </motion.div>

                            <span className={`block text-[11px] font-light tracking-widest`}>
                                Choose a profile picture
                            </span>

                        </div>     

                        {/* SIGN UP first name*/}
                        <motion.div 
                            className="flex-1"
                            animate={shake ? { x: [-10, 10, -6, 6, -3, 3, 0] } : {}}
                        >
                            <input
                                id="user_first_name"
                                ref={payload_inputRefs.user_first_name}
                                name="user_first_name"
                                type="text"
                                placeholder="first name"
                                className="rounded-xl px-3 py-1.5 text-base text-sm placeholder:text-xs 
                                        text-black outline-1 -outline-offset-1 outline-black placeholder:text-gray-400 placeholder:italic 
                                        focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500"
                            />
                        </motion.div>

                        {/* SIGN UP last name*/}
                        <motion.div 
                            className="flex-1"
                            animate={shake ? { x: [-10, 10, -6, 6, -3, 3, 0] } : {}}
                        >
                            <input
                                id="user_last_name"
                                ref={payload_inputRefs.user_last_name}
                                name="user_last_name"
                                placeholder="last name"
                                className="rounded-xl px-3 py-1.5 text-base text-sm placeholder:text-xs 
                                            text-black outline-1 -outline-offset-1 outline-black placeholder:text-gray-400 placeholder:italic
                                            focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500"
                            />
                        </motion.div> 

                        {/* SIGN UP dob */}
                        <motion.div 
                            className="flex flex-col justify-start"
                            animate={shake ? { x: [-10, 10, -6, 6, -3, 3, 0] } : {}}
                        >
                            <div className="flex items-center justify-start gap-2">
                                {date_inputs.map((date_input, i) => (
                                    <React.Fragment key={date_input.id}>
                                    <input
                                        id={date_input.id}
                                        ref={(el: HTMLInputElement | null) => {date_inputRefs.current[i] = el;}}
                                        maxLength={date_input.maxLength}
                                        placeholder={date_input.placeholder}
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        onChange={(e) => date_handleChange(e, i, date_inputs, date_inputRefs)}
                                        onKeyDown={(e) => date_handleKeyDown(e, i, date_inputRefs)}
                                        className="w-12 h-8 flex items-center justify-center rounded-xl text-center text-black 
                                                    text-sm outline-1 outline-black focus:outline-2 focus:outline-indigo-500 cursor-text"
                                    />
                                    {/* Add / separators */}
                                    {i < date_inputs.length - 1 && <span className="text-black text-sm">/</span>}
                                    </React.Fragment>
                                ))}
                            </div>
                        </motion.div> 

                        {/* SIGN UP email */}
                        <motion.div 
                            className="flex flex-col justify-start"
                            animate={invalidEmail || emailInUse ? { x: [-10, 10, -6, 6, -3, 3, 0] } : {}}
                        >
                            <div className="mb-1">
                                <input
                                    id="user_email"
                                    ref={payload_inputRefs.signUp_user_email}
                                    name="user_email"
                                    type="email"
                                    placeholder="email"
                                    className="w-3/5 rounded-xl px-3 py-1.5 text-base text-sm placeholder:text-xs
                                            text-black outline-1 -outline-offset-1 outline-black placeholder:text-gray-400 placeholder:italic 
                                            focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500"
                                />
                            </div>
                        </motion.div>

                        {/* SIGN UP confirm email */}
                        <motion.div 
                            className="flex flex-col justify-start"
                            animate={invalidEmail || emailNotMatch || emailInUse ? { x: [-10, 10, -6, 6, -3, 3, 0] } : {}}
                        >
                            <div className="mb-1">
                                <input
                                    id="user_email"
                                    ref={payload_inputRefs.signUp_confirm_user_email}
                                    name="user_email"
                                    type="email"
                                    placeholder="confirm email"
                                    className="w-4/5 rounded-xl px-3 py-1.5 text-base text-sm placeholder:text-xs
                                            text-black outline-1 -outline-offset-1 outline-black placeholder:text-gray-400 placeholder:italic 
                                            focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500"
                                />
                            </div>
                            <span className={`block text-[11px] font-light text-white text-left tracking-widest ${emailInUse ? "" : "hidden"}`}>
                                Email is already in use
                            </span>
                        </motion.div>

                        {/* SIGN Up username */}
                        <motion.div 
                            className={`flex flex-col justify-start`}
                            animate={shake ? { x: [-10, 10, -6, 6, -3, 3, 0] } : {}}
                        >
                            <div className="mb-1">
                                <input
                                    id="user_name"
                                    ref={payload_inputRefs.user_name}
                                    name="user_email"
                                    type="text"
                                    placeholder="choose user name"
                                    className="rounded-xl px-3 py-1.5 text-base text-sm placeholder:text-xs
                                            text-black outline-1 -outline-offset-1 outline-black placeholder:text-gray-400 placeholder:italic 
                                            focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500"
                                />
                            </div>
                        </motion.div>

                        {/* SIGN UP Password */}
                        <motion.div 
                            className={`flex flex-col justify-between`}
                            animate={shake ? { x: [-10, 10, -6, 6, -3, 3, 0] } : {}}
                        >
                            <div className="flex gap-2">
                                {[0, 1, 2, 3, 4, 5].map((i) => (
                                        <input
                                            key={i}
                                            ref={(el: HTMLInputElement | null) => {passcode_inputRefs.current[i] = el;}}
                                            maxLength={1}
                                            type="tel"
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            onChange={(e) => passcode_handleChange(e, i, passcode_inputRefs)}
                                            onKeyDown={(e) => passcode_handleKeyDown(e, i, passcode_inputRefs)}
                                            onTouchStart={(e) => {
                                                (e.target as HTMLInputElement)?.focus();
                                            }}
                                            placeholder="0"
                                            className="w-8 h-8 flex items-center justify-center rounded-xl
                                                        text-center text-black text-md font-thin outline-1 placeholder:opacity-20
                                                        focus:outline-2 focus:outline-indigo-500 cursor-text"
                                            tabIndex={0} 
                                            />
                                ))}
                            </div>
                            <span className={`block mt-2 text-[11px] font-light  tracking-widest`}>
                                Choose a 6 digit numeric password
                            </span>
                        </motion.div>

                        {/* SIGN UP button */}
                        <motion.div
                            whileHover={{ scale: 1.02 }} 
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="shadow-xl bg-cyan-500 flex rounded-[30px] p-3 text-sm font-light tracking-widest
                                        cursor-pointer outline-1 rounded-l-none"
                            onClick={handleSignUp}
                        >
                            sign Up
                        </motion.div>  

                        {/* SIGN IN button */}
                        <motion.div
                            className={`p-1 cursor-pointer flex items-end border-r-1 border-b-1 border-black rounded-r-[30px]
                                        cursor-pointer tracking-widest font-extralight 
                                        overflow-hidden `}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.90 }}
                        >
                            <h1 className="w-2/3 mt-2 py-2 px-3 flex items-end justify-start pb-1 text-[11px] bg-transparent">
                                A goMeal user ?
                            </h1>
                            <div 
                                className="w-1/2 py-2 px-3 text-sm flex items-center border-l-1 border-black justify-start px-2"
                                onClick={() => router.push("/auth?mode=signin")}
                            >
                                sign in
                            </div>
                        </motion.div>

                        {/* SIGN UP privacy text */}
                        <span className={`text-[9px] font-thin tracking-widest mt-1`}>
                            We respect your privacy and use your information for account management.
                            Before continuing, review our <span className="font-bold text-black underline cursor-pointer">Privacy policy</span> .
                        </span>   

                    </div>

                </div>

            </div> 

        </>

    );
};

export const ConfirmSignUp: React.FC<ConfirmSignUpProps> = ({ payload }) => {

    const router = useRouter();
    const passcode_inputRefs = useRef<Array<HTMLInputElement | null>>([]);
    const [shake, setShake] = useState(false);
    const [seconds, setSeconds] = useState(60);
    const [showButton, setShowButton] = useState(false);

    useEffect(() => {
        if (seconds <= 0) return setShowButton(true);
        const timer = setTimeout(() => setSeconds((s) => s - 1), 1000);
        return () => clearTimeout(timer);
    }, [seconds]);

    const handleConfirmUser = async () => {

        const code = passcode_inputRefs.current.map(input => input?.value).join('');
        if (!code) setShake(true);

        try {
            const res = await cognitoConfirmUser(payload.email, code);

            if (res.success) {
                
                const response = await fetch('https://api.gomeal.org/auth/signup', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (response.ok) {
                    console.log("User inserted into DB:", data.user);
                    router.push("/auth?mode=signin");
                } else {
                    console.error("Error inserting user:", data.error);
                    alert(data.error || "Failed to insert user.");
                }
            } 
        } catch (err) {
            console.error("Unexpected error confirming user:", err);
        }
                    
    };

    const handleResendConfirmationCode = async () => {

        try {
            const res = await resendConfirmUser(payload.email);

            if (res.success) {
                passcode_inputRefs.current.forEach((input) => {
                    if (input) input.value = "";
                });

                passcode_inputRefs.current[0]?.focus();

                console.log("Confirmation code resent successfully.");
            } 
        } catch (err) {
            console.error("Unexpected error resending confirmation code:", err);
        }
    };


    return (
        <>
            <div className="fixed inset-0 backdrop-blur-sm z-10"/>

            <div className="fixed inset-0 z-20 flex items-center justify-center">

                <div className={`p-5 flex flex-col items-center justify-center gap-5 backdrop-blur-xs`} onClick={(e) => e.stopPropagation()}>

                    <span className={`block mt-2 text-[17px] font-extralight text-white text-center tracking-widest`}>
                        Please enter the code sent to {payload.email}.
                    </span>     

                    <motion.div 
                        className={`flex flex-col justify-between mt-5`}
                        animate={shake ? { x: [-10, 10, -6, 6, -3, 3, 0] } : {}}
                    >
                        <div className="flex gap-2">
                            {[0, 1, 2, 3, 4, 5].map((i) => (
                                    <input
                                        key={i}
                                        ref={(el: HTMLInputElement | null) => {passcode_inputRefs.current[i] = el;}}
                                        maxLength={1}
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        onChange={(e) => passcode_handleChange(e, i, passcode_inputRefs)}
                                        onKeyDown={(e) => passcode_handleKeyDown(e, i, passcode_inputRefs)} 
                                        className="w-8 h-8 flex items-center justify-center rounded-md bg-white
                                                    text-center text-black text-md font-thin outline-1
                                                    focus:outline-2 focus:outline-indigo-500 cursor-text"
                                        tabIndex={0} 
                                    />
                            ))}
                        </div>
                    </motion.div>

                    <span className={`block mt-2 text-[10px] font-thin text-white text-center tracking-widest`}>
                        Check your spam folder if you didn’t get the email
                    </span>

                    <motion.div
                        whileHover={{ scale: 1.05 }} 
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className={`w-11/12 flex flex-col mt-5 justify-center rounded-[30px] px-5 py-3 text-sm font-light tracking-widest 
                                    cursor-pointer outline-2 outline-black bg-white rounded-l-none`}
                        onClick={handleConfirmUser}
                    >
                        Confirm 
                    </motion.div> 

                    {!showButton ? (
                        <motion.div className="w-11/12 relative flex flex-col mt-5 justify-center rounded-[30px] rounded-l-none px-5 py-3 text-sm font-light bg-transparent text-white tracking-widest cursor-pointer outline-2 outline-white overflow-hidden">
                            <motion.div
                                className="absolute top-0 left-0 h-full bg-black"
                                initial={{ width: "0%" }}
                                animate={{ width: `${((60 - seconds) / 60) * 100}%` }}
                                transition={{ ease: "linear", duration: 0.5 }}
                            />
                            <span className="relative z-10 font-thin text-white text-[12px] tracking-widest">
                                Please wait {seconds}s before you can resend.
                            </span>
                        </motion.div> 
                    ) : (
                        <motion.div
                            whileHover={{ scale: 1.05 }} 
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className={`w-11/12 flex flex-col mt-5 justify-center rounded-[30px] px-5 py-3 text-sm font-light bg-black text-white tracking-widest 
                                        cursor-pointer outline-2 outline-black rounded-l-none`}
                            onClick={handleResendConfirmationCode}
                        >
                            Resend 
                        </motion.div>   
                    )}

                </div>

            </div>
        </>

    );
};
