import React, { useState, useEffect } from 'react';
import './Navbar.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import {
    openInviteList, openSearch, openSettings,
} from '../../../client/action/navigation';
import { isCrossVerified } from '../../../util/matrixUtil';

import NavbarLinks from './NavbarLinks';
import NotificationBadge from '../../atoms/badge/NotificationBadge';

import { useDeviceList } from '../../hooks/useDeviceList';

import { tabText as settingTabText } from '../settings/Settings';

function CrossSigninAlert() {
    const deviceList = useDeviceList();
    const unverified = deviceList?.filter((device) => isCrossVerified(device.device_id) === false);
  
    if (!unverified?.length) return null;
  
    return (
        <li>
            <a onClick={() => openSettings(settingTabText.SECURITY)}>
                <i class="danger fa-solid fa-user-shield"></i>
            </a>
        </li>
    );
}

function ProfileAvatarMenu() {
    const mx = initMatrix.matrixClient;
    console.log("!!", mx);
    const userId = mx.getUserId();
    const [profile, setProfile] = useState({
        avatarUrl: null,
        displayName: mx.getUser(userId).displayName,
        userId: userId.slice(1, userId.indexOf(":"))
    });

    useEffect(() => {
        const userId = mx.getUserId();
        const user = mx.getUser(userId);
        const setNewProfile = (avatarUrl, displayName) => setProfile({
            avatarUrl: avatarUrl || null,
            displayName: displayName || profile.displayName,
            userId: userId.slice(1, userId.indexOf(":"))
        });
        const onAvatarChange = (event, myUser) => {
            setNewProfile(myUser.avatarUrl, myUser.displayName);
        };
        mx.getProfileInfo(mx.getUserId()).then((info) => {
            setNewProfile(info.avatar_url, info.displayname);
        });
        user.on('User.avatarUrl', onAvatarChange);
        return () => {
            user.removeListener('User.avatarUrl', onAvatarChange);
        };
    }, []);

    return (
      <li class="dropdown">
          <a class="login">
              <img class="avatar" src={profile.avatarUrl !== null ? mx.mxcUrlToHttp(profile.avatarUrl, 42, 42, 'crop') : null} />
              <span class="user-name">{ profile.displayName }</span>
          </a>
          <ul class="dropdown-menu">
              <li>
                  <a href={`https://incremental.social/u/${profile.userId}`}>Profile</a>
              </li>
              <li>
                  <a onClick={openSettings}>Settings</a>
              </li>
              <li>
                  <a onClick={() => initMatrix.logout()}>Log out</a>
              </li>
          </ul>
      </li>
    );
}

function useTotalInvites() {
    const { roomList } = initMatrix;
    const totalInviteCount = () => roomList.inviteRooms.size
        + roomList.inviteSpaces.size
        + roomList.inviteDirects.size;
    const [totalInvites, updateTotalInvites] = useState(totalInviteCount());

    useEffect(() => {
        const onInviteListChange = () => {
            updateTotalInvites(totalInviteCount());
        };
        roomList.on(cons.events.roomList.INVITELIST_UPDATED, onInviteListChange);
        return () => {
            roomList.removeListener(cons.events.roomList.INVITELIST_UPDATED, onInviteListChange);
        };
    }, []);

    return [totalInvites];
}

function Navbar() {
    const [totalInvites] = useTotalInvites();

    return (
        <div className="nav-container">
            <div className="nav">
                <menu class="mobile-links">
                    <li class="dropdown">
                        <a>
                            <i class="fa-solid fa-bars"></i>
                        </a>
                        <ul class="dropdown-menu">
                            <NavbarLinks />
                        </ul>
                    </li>
                </menu>
                <a href="https://incremental.social" class="logo">
                    <img id="logo" src="https://incremental.social/mbin_logo.svg" alt="Homepage" title="Homepage" />
                </a>
                <menu class="desktop-links">
                    <NavbarLinks />
                </menu>
                <div class="flex-spacer"></div>
                <menu>
                    <li>
                        <a onClick={() => openSearch()}>
                            <i class="fa-solid fa-magnifying-glass"></i>
                        </a>
                    </li>
                    {totalInvites !== 0 && (
                        <li>
                            <a onClick={() => openInviteList()}>
                                <i class="fa-solid fa-envelope"></i>
                            </a>
                            <NotificationBadge alert content={totalInvites} />
                        </li>
                    )}
                    <CrossSigninAlert />
                    <ProfileAvatarMenu />
                </menu>
            </div>
        </div>
    );
}

export default Navbar;
