import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  ResendConfirmationCodeCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!
const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION!

// Initialize Cognito client
export const cognitoClient = new CognitoIdentityProviderClient({
  region: AWS_REGION,
});

// Response types
type SignUpResponse = {
  success: boolean;
  sub?: string;
  error?: string;
};

type GenericResponse = {
  success: boolean;
  error?: string;
  alreadyConfirmed?: boolean;
};

// Sign up a new user
export const signUpUser = async (
  email: string,
  password: string,
  profile_name: string
): Promise<SignUpResponse> => {
  try {
    const command = new SignUpCommand({
      ClientId: CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "name", Value: profile_name },
      ],
    });

    const response = await cognitoClient.send(command);
    return { success: true, sub: response.UserSub };
  } catch (err: any) {
    if (err.name === "UsernameExistsException") {
      return { success: false, error: "Email already in use" };
    }
    console.error("Sign up error:", err);
    return { success: false, error: err.message };
  }
};

// Handle forgot password
export const handleForgotPassword = async (
  email: string
): Promise<GenericResponse> => {
  try {
    const command = new ForgotPasswordCommand({
      ClientId: CLIENT_ID,
      Username: email,
    });

    const response = await cognitoClient.send(command);
    console.log("Code sent:", response);
    return { success: true };
  } catch (err: any) {
    if (
      err.name === "InvalidParameterException" &&
      err.message.includes("no registered/verified email or phone_number")
    ) {
      return {
        success: false,
        error:
          "Cannot reset password because your account has no verified email or phone number. Please contact support.",
      };
    }
    console.error("Forgot password error:", err);
    return { success: false, error: err.message };
  }
};

// Confirm forgot password
export const handleConfirmForgotPassword = async (
  email: string,
  code: string,
  newPassword: string
): Promise<GenericResponse> => {
  try {
    const command = new ConfirmForgotPasswordCommand({
      ClientId: CLIENT_ID,
      Username: email,
      ConfirmationCode: code,
      Password: newPassword,
    });

    const response = await cognitoClient.send(command);
    console.log("Password reset success:", response);
    return { success: true };
  } catch (err: any) {
    console.error("Confirm password error:", err);
    return { success: false, error: err.message };
  }
};

// Confirm user signup
export const handleConfirmUser = async (
  email: string,
  code: string
): Promise<GenericResponse> => {
  try {
    const command = new ConfirmSignUpCommand({
      ClientId: CLIENT_ID,
      Username: email,
      ConfirmationCode: code,
    });

    const response = await cognitoClient.send(command);
    console.log("User confirmed:", response);
    return { success: true };
  } catch (err: any) {
    if (
      err.name === "NotAuthorizedException" &&
      err.message.includes("Current status is CONFIRMED")
    ) {
      console.log("User already confirmed. Proceed to login.");
      return { success: true, alreadyConfirmed: true };
    }
    console.error("Confirm user error:", err);
    return { success: false, error: err.message };
  }
};

// Resend confirmation code
export const handleResendConfirmationCode = async (
  email: string
): Promise<GenericResponse> => {
  try {
    const command = new ResendConfirmationCodeCommand({
      ClientId: CLIENT_ID,
      Username: email,
    });

    const response = await cognitoClient.send(command);
    console.log("Confirmation code resent:", response);
    return { success: true };
  } catch (err: any) {
    console.error("Resend code error:", err);
    return { success: false, error: err.message };
  }
};
