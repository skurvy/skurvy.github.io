---
layout: post
title:  "Guide: Installing Proxmox on a Stubborn Dell Poweredge"
date:   2022-06-26
categories: [guide, proxmox, homelab]
---
<!--more-->

## Table of contents
1. [Introduction](#Introduction)
2. [Prep](#Prep)
3. [Instructions](#Instructions) <br />
    a. [Debian Install](#1-Debian-Install)<br />
    b. [Proxmox Install](#2-Proxmox-Install)<br />
    c. [Post Install Steps](#3-Post-Install-Steps)<br />
4. [Closing](#Closing)
5. [Resources](#Resources)

## Introduction
This guide is for anyone having issues installing proxmox on a Dell Poweredge. I received a R610 from a friend and wanted to install proxmox on it and add it to my existing cluster. I ran into issues with ACPI errors, as well as issue with the display and ahd to put in some work to get everything working.

You will be installing Debian and installing proxmox over it. There is a guide for this, but if you want to be able to join the cluster, there are some extra steps needed that are not already documented (as far as I can tell)

If you are having trouble with the install and would love to skip all the pain I had to endure with the trial and error of getting this setup, follow the below instructions. If you ever want to be able to join a cluster, this guide is a must. I had to string together a bunch of forum answers (posted in the [resources](#Resources) section below)

### Prep:
- BACKUPS!! I would suggest backing any existing VMs up to a usb and crushing any existing configs. Obviously you do all of this at your own risk.
- [BalenaEtcher](https://www.balena.io/etcher/) if you are burning iso's from Windows. Rufus does some weird stuff and I had lots of issues with it. If you're on linux, [just use dd as usual](https://itsfoss.com/live-usb-with-dd-command/)
- [Debian 11 iso](https://www.debian.org/distrib/) on a bootable flashdrive
- I'm assuming you already have RAID setup. I'm using RAID 0, but that portion is up to you to figure out.

## Steps
[Step 1](#1_Debian-Install): Install debian 11<br />
[Step 2](#2_Proxmox-Install): Install proxmox on-top of Debian<br />
[Step 3](#3_Post-Install-Steps): After Proxmox has booted, there are still a few things you need to configure<br />

### 1. Debian Install

1. Insert the bootable Debian USB into the server
2. Hit `f11` to get into UEFI boot menu
3. Select the bootable USB
4. Choose `Graphical Install`
5. Go through the standard install steps until you get to hostname
6. hostname: choose the name you want your node to be named. for this example I will use "server1"
7. Domain name: choose your local domain if you have one. If not, I just put "lan" here
8. Continue with the user and password setup as you wish, until you get to the `Partition Disk` section.
9. FOLLOW THESE NEXT STEPS CAREFULLY. If you want join a cluster, you will need to set the lvm names manually. Also, this is the part where you lose data. If you have something you need to backup, restart this and do that.
10. Pick `Guided - use entire disk and set up LVM` option
11. I chose `All files in one partition` but that is up to you
12. Click `yes`
13. IF you need to, click `go back` and select `Partition disks again`. Once you get back to the `Partition Disks` screen, DO NOT HIT FINISH YET
14. Click `Configure the Logical Volume Manager`, then click `yes`
15. Click `Display configuration details` and take note of which disk the lvm is currently on. You will need to know this for step 18.
16. Click `delte logical volume` and delete both `root` and `swap_1`.<br /> Note: The reason for this, is that proxmox expects you to have a lvm called `pve` if it is not named pve, joining a cluster will cause a ton of issues since that is where clusters look for storage
17. Now, Click `delete volume group` and delete the `<hostname>-vg` volume group.
18. Click `Create volume group` and name it `pve` select the drive that the previous volume group was on.
19. Click `Create logical volume` and create `root` under `pve`. Give it as much room as you want for the OS plus any iso images, vz backups, and container templates on this node.
20. Now `Create logical volume` and create `swap_1`. This will be your swap, so give it as much as you want (I did like 4GBs)
21. You should have a large amount of unused storage. This is fine. We will be using it to create pve-data once we install proxmox
22. Verify the config in `Display configuration details`
23. Should look something like this: <br /> pve <br />&emsp;physical volume: `/dev/sd<drive you chose>` <br/>&emsp;&emsp;provides logical volume: root <br />&emsp;&emsp;provides logical volume: swap_1
24. If it is all good, click finish.
25. Back at the `Partition Disks` page, click the `pve data #1` drive. Make sure it is set to `do not use`
26. Now `pve root #1`: use as `EXT4 journaling file system` and `mount point: \ - root`
27. `pve swap_1 #1`: use as `swap area`
28. leave the `primary` as is, finish, and write changes to disk.
29. continue with defaults until you get to `software selection`. 
30. Only select `ssh server` and `standard system utilities`
31. Finish the install and reboot into debian!

### 2. Proxmox Install
 
1. NOTE:READ THIS FIRST: PAUSE BEFORE REBOOTING TO PROXMOX! <br /> Also, make life easier by doing the static ip config first and sshing in so you can copy-paste commands.
2. Now that you are in debian SU to root and follow this guide. MAKE SURE NOT TO REBOOT. Come back to this guide first. [guide](https://pve.proxmox.com/wiki/Install_Proxmox_VE_on_Debian_11_Bullseye) <br /> Note: We need to turn acpi off to make sure it will even reboot. Otherwise, you will have a fun time setting that flag with a live image. 
3. Before rebooting, edit `/etc/default/grub` and add `acpi=off` to `GRUB_CMDLINE_LINUX_DEFAULT='quite'`. <br />Should look like `GRUB_CMDLINE_LINUX_DEFAULT='quite acpi=off'`
4. run `\usr\sbin\grub-mkconfig > /boot/grub/grub.cfg`
5. for a sanity check run: `cat /boot/grub/grub.cfg | grep acpi=off` and make sure you can see a few lines
6. Reboot, and return back to/finish the guide above. (clean up the old kernel and os-prob... etc.)

### 3. Post Install Steps

1. As root, edit `/etc/network/interfaces` and create a vmbr0 to the interface your ethernet is plugged into. Set that vmbr0 to the static IP you used previously and bridge it to the interface.
2. Remove the old config from the interface itself by just deleting those fields. Save and exit.<br /> Complete config should look like this:
    ```
    auto <old iface>
    iface <old iface> inet manual

    <other interfaces etc. here...>

    auto vmbr0
    iface vmbr0 inet manual
        address <static-ip>/<cidr>
        gateway <gateway-ip>
        bridge_ports <old iface>
        bridge_stp off
        bridge_fd 0
    ```
3. make sure that your `/etc/hosts` is still `<static-ip> <hostname>.lan <hostname>`
4. Run the following commands: 
    ```
    ifdown <old iface> 
    ifup vmbr0
    ifup <old iface>
    ``` 
5. Make sure you can ping your gateway
6. Navigate to the web ui at `https://<static-ui>:8006/`
7. Now we need to make the `pve/data` lv(s)
8. In the shell tab, run `lvscan` and `lvs`
9. You should see `root` and `swap` with `pve` as their VG.
10. run: `lvcreate --name data -T -l +100%FREE pve` <br /> Note: this will use the rest of the disk space to make the `data` lv
11. On the gui, click on the node (not datacenter) and navigate to `disk` -> `LVM-THIN`. you should see data there.
12. Now click the datacenter and navigate to `storage`.
13. Click `Add` -> `LVM-Thin` and set the following configs
    ```
    ID: local-thin
    Volume group: pve
    Thin pool: data
    Content: Disk image, Container
    ```
14. go back to the shell on your node and run `lvscan` and `lvs`. verify data is there. You should also see `local-thin` in your server view on the gui


## Closing

You should be good to join the cluster now! There may be a better way to do all this, but after DAYS of troubleshooting, this is what worked for me. Please let me know if this helped you out. I couldn't find anything like this out there and I am new to the homelab scene and figured I could hopefully help someone having a similar issue.

## Resources
- [https://www.balena.io/etcher/](https://www.balena.io/etcher/)
- [https://itsfoss.com/live-usb-with-dd-command/](https://itsfoss.com/live-usb-with-dd-command/)
- [https://www.debian.org/distrib/](https://www.debian.org/distrib/)
- [https://pve.proxmox.com/wiki/Install_Proxmox_VE_on_Debian_11_Bullseye](https://pve.proxmox.com/wiki/Install_Proxmox_VE_on_Debian_11_Bullseye)
- [https://www.debian.org/releases/bookworm/amd64/ch06s03.en.html#di-make-bootable](https://www.debian.org/releases/bookworm/amd64/ch06s03.en.html#di-make-bootable)
- [https://pve.proxmox.com/wiki/Logical_Volume_Manager_(LVM)](https://pve.proxmox.com/wiki/Logical_Volume_Manager_(LVM))
- [https://forum.proxmox.com/threads/logical-volume-pve-data-is-not-a-thin-pool.54677/](https://forum.proxmox.com/threads/logical-volume-pve-data-is-not-a-thin-pool.54677/)
