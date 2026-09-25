# TechPro Inventory

Let's create another awesome app for my client - TechPro. Wesite for your reference - https://techprocanada.com

First let's create frontend and later I will add my Supabase account in it for the backend.

It's should be easy to use on both web as well as mobile. Theme should be engaging and minimal.

Version 1:

One screen by the name - Tool Types

Tool Types screen used to add Items (a text field)

Second Screen by the name - Inventory Items

Inventory Items screen have form with the following fields:

Tool Name - Text Field
Tool Type - Fetch from the Tool Types screen
Returnable - A dropdown field with 2 option - Returnable & Consumable
Total Qty Ordered - Number Field
Total Qty Issued - Number Field
Balance Qty - Calculated auto by (Total Qty Ordered - Total Qty Issued)
Threshold - Number Field
Essentials -  A Toggle

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bde21405-f5ff-480d-a073-c1aa69c312ba).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
