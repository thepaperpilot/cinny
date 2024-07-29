import React, { useState, useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { useNavigate } from 'react-router-dom';
import './Navbar.scss';

import { useMatrixClient } from '../../hooks/useMatrixClient';
import { openSearch, openSettings } from '../../../client/action/navigation';
import { allInvitesAtom } from '../../state/room-list/inviteList';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { useNavToActivePathAtom } from '../../state/hooks/navToActivePath';

import NavbarLinks from './NavbarLinks';
import NotificationBadge from '../../atoms/badge/NotificationBadge';
import { getInboxInvitesPath, getInboxNotificationsPath, getInboxPath, joinPathComponent } from '../../pages/pathUtils';
import { UserEventHandlerMap, UserEvent } from 'matrix-js-sdk';
import { getMxIdLocalPart } from '../../utils/matrix';
import { logoutClient } from '../../../client/initMatrix';

function Search() {
    try {
        useMatrixClient();
    } catch (e) {
        return null;
    }
    return (
        <li>
            <a onClick={() => openSearch()}>
                <i class="fa-solid fa-compass"></i>
            </a>
        </li>
    );
}

type UserProfile = {
  avatar_url?: string;
  displayname?: string;
};

function ProfileAvatarMenu() {
    let mx;
    try {
        mx = useMatrixClient();
    } catch (e) {
        return (
            <li>
                <a href="https://matrix.incremental.social/_matrix/client/v3/login/sso/redirect/oidc-incrementalsocial?redirectUrl=http%3A%2F%2Flocalhost%3A8082%2Flogin%2Fincremental.social">Log in</a>
            </li>
        );
    }
    const userId = mx.getUserId()!;
    const [profile, setProfile] = useState<UserProfile>({});
    const displayName = profile.displayname ?? getMxIdLocalPart(userId) ?? userId;
    const avatarUrl = profile.avatar_url
      ? mx.mxcUrlToHttp(profile.avatar_url, 96, 96, 'crop') ?? undefined
      : undefined;

    useEffect(() => {
        const user = mx.getUser(userId);
        const onAvatarChange: UserEventHandlerMap[UserEvent.AvatarUrl] = (event, myUser) => {
            setProfile((cp) => ({
            ...cp,
            avatar_url: myUser.avatarUrl,
            }));
        };
        const onDisplayNameChange: UserEventHandlerMap[UserEvent.DisplayName] = (event, myUser) => {
            setProfile((cp) => ({
            ...cp,
            avatar_url: myUser.displayName,
            }));
        };
        mx.getProfileInfo(userId).then((info) => setProfile(() => ({ ...info })));
        user?.on(UserEvent.AvatarUrl, onAvatarChange);
        user?.on(UserEvent.DisplayName, onDisplayNameChange);
        return () => {
            user?.removeListener(UserEvent.AvatarUrl, onAvatarChange);
            user?.removeListener(UserEvent.DisplayName, onDisplayNameChange);
        };
    }, [mx, userId]);

    return (
      <li class="dropdown">
          <a class="login">
              <img class="avatar" src={profile.avatar_url != null ? mx.mxcUrlToHttp(profile.avatar_url, 50, 50, 'crop') : null} />
              <span class="user-name">{ profile.displayname }</span>
          </a>
          <ul class="dropdown-menu">
              <li>
                  <a href={`https://incremental.social/u/${profile.displayname}`}>Profile</a>
              </li>
              <li>
                  <a onClick={openSettings}>Settings</a>
              </li>
              <li>
                  <a onClick={() => logoutClient(mx)}>Log out</a>
              </li>
          </ul>
      </li>
    );
}

function Navbar() {
    const screenSize = useScreenSizeContext();
    const navigate = useNavigate();
    let navToActivePath;
    const allInvites = useAtomValue(allInvitesAtom);
    const inviteCount = allInvites.length;
    
    try {
        useMatrixClient();
        navToActivePath = useAtomValue(useNavToActivePathAtom());
    } catch (e) {
    }

    function openInviteList() {
        if (screenSize === ScreenSize.Mobile) {
            navigate(getInboxPath());
            return;
        }
        const activePath = navToActivePath?.get('inbox');
        if (activePath) {
            navigate(joinPathComponent(activePath));
            return;
        }
  
        const path = inviteCount > 0 ? getInboxInvitesPath() : getInboxNotificationsPath();
        navigate(path);
    }

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
                    <Search />
                    <li>
                        <a onClick={() => openInviteList()}>
                            <i class="fa-solid fa-bell"></i>
                        </a>
                        {inviteCount !== 0 && (<NotificationBadge alert content={inviteCount} />)}
                    </li>
                    <ProfileAvatarMenu />
                </menu>
            </div>
        </div>
    );
}

export default Navbar;
