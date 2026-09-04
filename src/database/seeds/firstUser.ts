import { Knex } from "knex";
import bcrypt from "bcryptjs";

export async function seed(knex: Knex): Promise<void> {
  // Clear existing entries first (respects FK order — users has no dependents run before it)
  await knex("users").del();

  const passwordHash = await bcrypt.hash("Password123!", 10);

  await knex("users").insert([
    {
      first_name: "John",
      last_name: "Doe",
      email: "john.doe@example.com",
      phone_number: "08012345678",
      password: passwordHash,
    },
    {
      first_name: "Jane",
      last_name: "Smith",
      email: "jane.smith@example.com",
      phone_number: "08023456789",
      password: passwordHash,
    },
    {
      first_name: "Ade",
      last_name: "Okafor",
      email: "ade.okafor@example.com",
      phone_number: "08034567890",
      password: passwordHash,
    },
  ]);
}