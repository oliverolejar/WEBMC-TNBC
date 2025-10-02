# WEBMC-TNBC

## GETTING STARTED

## Python Download

The programming language we will be using. It is beginner friendly and has a lot of data science and machine learning libraries.  

Download link:  
>https://www.python.org/downloads/  

## Git Download

Git is a system used for version control. Version control allows developers to work on the same code base while continually improving it and adding features. It also allows for collaboration been developers on the same code.  

Download link:  
>https://git-scm.com/downloads/win  

## Code Editor (Visual Studio Code)

This is a program that allows you to view and edit files, as well as run code.  

Download link:  
>https://code.visualstudio.com/download  

**After installing VS Code (add these extensions):**
1) Open **Extensions** (left sidebar).  
2) Search **Python Extension Pack** → **Install**.  
3) Search **GitHub Extension Pack** → **Install**.

## Arduino IDE

We will be using an IDE (Integrated Development Environment) specifically made for the Arduino. The Arduino is a microcontroller (basically a small single purpose computer on a chip) that has a multittude of sensors that we will be using to extract data with. For now you just need to install this program so that later we can add code to these Arduinos.

Download link:
>https://www.arduino.cc/en/software/

## How to Clone Club Code Repository onto VS Code

1) On GitHub, click the green **Code** button → **HTTPS** → **Copy** the link.  
2) Open **VS Code** → **Ctrl/Cmd+Shift+P** → type **Git: Clone** → **Enter**.  
3) **Paste** the link → **Enter**.  
4) Pick a local **folder** to save the repo.  
5) When prompted, click **Open** to open the cloned repository in VS Code.


## Navigate to your own branch

**What’s the terminal?** It’s a panel inside VS Code where you type commands (Git, Python, etc.).  
**Open it:** VS Code top menu → **Terminal** → **New Terminal** (default shell is fine on both Windows and macOS).


**Steps of commands to type/copy into the terminal:**
1) See all local branches:
>git branch
2) Switch to your pre-made branch (replace with your name):
>git switch your-name-branch
3) Verify you’re on it (the `*` marks the current branch):
>git branch

## Virtual Environment Set Up

1) Open **Terminal → New Terminal** in VS Code (make sure the path shows your project folder).
2) **Create** a virtual environment (one-time, keep the default name `venv`):

Windows (either works depending on your setup)

>python -m venv venv

or

>py -3 -m venv venv

macOS/Linux

>python3 -m venv venv

3) **Activate** the virtual environment (do this every time you open a new terminal):

Windows PowerShell

>.\venv\Scripts\Activate.ps1

Windows CMD

>venv\Scripts\activate.bat

macOS/Linux

>source venv/bin/activate

4) **Confirm** it worked: your terminal prompt should start with `(venv)`.  
   Optional check:
>python --version
>pip --version

## Installing Necessary Libraries

1) Make sure your virtual environment is **active** (your terminal prompt starts with `(venv)`).
2) **What are libraries?**  
   They’re pre-built tools/packages (e.g., NumPy, Pandas) that our code depends on. We list them (with versions) in `requirements.txt` so everyone installs the same set.
3) **Install everything from `requirements.txt`:**
>pip install -r requirements.txt
4) **Quick check (optional):**
>python -c "import numpy, pandas; print('OK')"  

**If you see errors:**  
- Confirm `(venv)` is visible in the terminal.  
- Upgrade pip, then try again:
>python -m pip install --upgrade pip
>pip install -r requirements.txt

## GitHub Repository Structure

**Branches (where code lives):**
- **Main** → The stable/best version of the project. We keep this clean.
- **Dev** → Team working area (a copy of Main we build on before updates go to Main).
- **your-name-branch** → **Your** personal workspace. Do your changes here.  
  > Need another branch? Please ask the lead first.

**Key files and folders (what they mean):**
- **`venv/`** → Your local **v**irtual **env**ironment (installed Python libraries for this project).  
  *Stays on your computer; not uploaded to GitHub.*
- **`.gitignore`** → A list of files/folders **not** to upload (e.g., `venv/`, large data, secrets).
- **`README.md`** → This setup/guide file. Start here when opening the repo.
- **`requirements.txt`** → The project’s Python libraries **with versions** so everyone installs the same set.
- **`*.py` files** → Python source code you’ll edit and run.

## TUTORIALS & RESOURCES

## Beginner Python Tutorial

Video Link:  
https://www.youtube.com/watch?v=kqtD5dpn9C8

## Basic Data Science Python Libraries Tutorial

Video Link: