import db from "@/services/db";
import { User, Avatar } from "@/types/user.types";

type SignUpUserParams = {
  firstName: string;
  lastName?: string;
  email: string;
  dob?: string;
  profile_name: string;
  avatar: Avatar;
};

type InsertUserParams = SignUpUserParams & {
  provider: string;
  provider_sub?: string;
};

const insertUser = async ({
  firstName,
  lastName = "",
  email,
  dob,
  profile_name,
  avatar,
  provider,
  provider_sub,
}: InsertUserParams): Promise<{ sub: string }> => {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const subResult = await client.query(`SELECT nextval('user_sub_seq') AS sub`);
    const sub = subResult.rows[0].sub.toString();

    const insertResult = await client.query(
      `
      INSERT INTO users (
        sub,
        first_name,
        last_name,
        email,
        dob,
        profile_name,
        avatar,
        status,
        provider,
        provider_sub
      ) VALUES (
        $1,
        $2,
        $3,
        $4,
        NULLIF($5, '')::date,
        $6,
        $7,
        'active',
        $8,
        $9
      )
      RETURNING sub
      `,
      [
        sub,
        firstName,
        lastName,
        email,
        dob ?? null,
        profile_name,
        avatar,
        provider,
        provider_sub ?? sub,
      ]
    );

    if (!insertResult.rowCount) {
      throw new Error("User insertion failed");
    }

    await client.query("COMMIT");

    return { sub };
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Sign up error:", err.detail ?? err.message);
    throw new Error("Signup failed");
  } finally {
    client.release();
  }
};

export const signUpUser = async (
  user: SignUpUserParams
): Promise<{ sub: string }> => {
  return insertUser({
    ...user,
    provider: "gomeal",
  });
};

export const signUpSocialUser = async (
  user: SignUpUserParams & {
    provider: string;
    provider_sub: string;
  }
): Promise<{ sub: string }> => {
  return insertUser(user);
};
