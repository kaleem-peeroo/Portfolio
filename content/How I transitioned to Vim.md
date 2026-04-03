---
draft: true
---

This is the story of how I transitioned to VIM in the hope that it helps you transition to VIM too. 
When I first started coding I used good ol' Sublime text. Then in 2018, I moved to good ol' Visual Studio Code and never looked back. I actually looked forward. Forward to VIM which has many benefits though I won't list them here to save us both time.

The problem was that the transition to VIM was a big step...and big first steps are always hard. I started by enabling VIM mode in VSC. I watched tutorials and learned the basics through `vimtutor` and then forced myself to continue writing code using VIM mode in VSC. I'm not going to lie...it was hard in the beginning. Fighting the urge to go back to the ol' ways of navigating code was a recurring thing. I remember getting fat fingers during a meeting while showing some code to a supervisor. My cursor was going everywhere but where I wanted it to go. The pressure was exaggerating the learning curve. Eventually you get used to the movements and you form the muscle memory. You feel less and less friction over time until you come to the realisation that it's time to move to VIM, the application. 

That's when I decided to use Neovim but I didn't know where to start and which config to use. There were so many options. After browsing a few Reddit posts and talking to a friend who used Neovim I ended up picking LazyVim. I think of myself as lazy. Others may call it efficient. Maybe that's why I chose LazyVim. Regardless, it was nice. I was surprised at how well the application mimicked an IDE like VSC. You could browse files, create panes for terminal usage, see debug output, etc. It was nice. For a while. There were so many plugins and I didn't know what each plugin did. It took too much time going through each plugin, learning what it does, how it works, and how to configure it.

So, I decided to do what probably every NeoVim user has done numerous times. I redid my config. I removed everything related to LazyVim and just created a single config file. I only added the plugins that I understood and wanted to use. One of the first ones I added was Oil.


# Timeline
- I used to use sublime then moved to VSC in 2018
- I started by using vim motions in VSC around March 2023
- I then moved to neovim with Lazy config
- I then moved to empty config and added my own plugins
- I then rewrite the plugins to be in individual files so that it easier to keep all configs for each plugin contained and atomic
- I can't think back to how I used to navigate without vim
- I used to use combination of shift control and arrow keys which seem so bizarre now

# Why VIM?
- Faster.
	- How much faster?
- Easier shortcuts
	- I loved shortcuts in VSC - but lots of combinations of ctrl, shift, and alt
	- VIM has intuitive motions that are easier to trigger