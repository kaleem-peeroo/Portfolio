---
title: AutoPerf
aliases:
  - /autoperf
draft: false
last_updated: 2026-06-25
---

# Intro
[AutoPerf](https://github.com/kaleem-peeroo/AutoPerf) is a tool that I built for automated performance testing of data distribution service.
Built entirely in Python all by myself before AI became a thing.
You first define configurations of your experimental campaigns which includes settings like parameter values, machines used, smart plug IPs, etc. You then run the tool and it will set up connections with the machines, ensure that the appropriate software is available (RTI's Perftest) and then run experiments with machine restarts before each experiment. It tracks the status of experiments in real-time and I even created a monitoring tool to display this as a nice TUI which I would access and view via my phone through SSH.

How does it work?
1. Define configuration
	1. What parameters do you want to vary
	2. What values per parameter?
		1. Do you have specific values you want to try?
		2. Do you want to randomly sample values?
	3. Do you have a specific list of experiments that you want to run?
	4. What machines are you working with?
		1. Which machines should have pubs/subs/both?
	5. How many times should you run each experiment?
	6. How many times should you retry an experiment if it fails?
	7. Do you want to add simulated network noise?
		1. random delays
		2. packet loss
		3. packet corruption
2. Run the experiment.
	1. Ping machines to check their accessible
	2. Restart all machines
	3. Check accessibility
	4. Launch experiment scripts per machine
	5. Wait for experiment to end
3. Download data from each machine.
4. Run next experiment until end of campaign.
# Challenges
- sometimes machines are unreachable (both via ping or ssh)
- when one machine fails, all others continue running anyway
- experiments with no data
- experiments with data from previously running experiments
- experiments that fail on first try but eventually succeed when rerun
# Mistakes
- not using OOP at the start
- not having an explicit config file - configuration settings were hardcoded into source code
# Technical Decisions
- choosing Python
	- easiest to write in
	- quick to write
	- lots of libraries from community to do what I needed
		- e.g. paramiko for SSH connection
- not using OOP at the start
	- got really messy
	- eventually moved to OOP
		- real-life painful lesson of the benefits of OOP
# What I'd Do Differently
- Learn and write in Rust.
- Use a database - maybe something like MongoDB because data is very tabular.
# Future Work
How to scale?
How to optimise?