import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './SideBar.scss';

import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import colorMXID from '../../../util/colorMXID';
import {
  selectTab, openShortcutSpaces, openReusableContextMenu,
} from '../../../client/action/navigation';
import { moveSpaceShortcut } from '../../../client/action/accountData';
import { abbreviateNumber, getEventCords } from '../../../util/common';

import Avatar from '../../atoms/avatar/Avatar';
import NotificationBadge from '../../atoms/badge/NotificationBadge';
import ScrollView from '../../atoms/scroll/ScrollView';
import SidebarAvatar from '../../molecules/sidebar-avatar/SidebarAvatar';
import SpaceOptions from '../../molecules/space-options/SpaceOptions';

import HomeIC from '../../../../public/res/ic/outlined/home.svg';
import UserIC from '../../../../public/res/ic/outlined/user.svg';
import AddPinIC from '../../../../public/res/ic/outlined/add-pin.svg';

import { useSelectedTab } from '../../hooks/useSelectedTab';

function useNotificationUpdate() {
  const { notifications } = initMatrix;
  const [, forceUpdate] = useState({});
  useEffect(() => {
    function onNotificationChanged(roomId, total, prevTotal) {
      if (total === prevTotal) return;
      forceUpdate({});
    }
    notifications.on(cons.events.notifications.NOTI_CHANGED, onNotificationChanged);
    return () => {
      notifications.removeListener(cons.events.notifications.NOTI_CHANGED, onNotificationChanged);
    };
  }, []);
}

function FeaturedTab() {
  const { roomList, accountData, notifications } = initMatrix;
  const [selectedTab] = useSelectedTab();
  useNotificationUpdate();

  function getHomeNoti() {
    const orphans = roomList.getOrphans();
    let noti = null;

    orphans.forEach((roomId) => {
      if (accountData.spaceShortcut.has(roomId)) return;
      if (!notifications.hasNoti(roomId)) return;
      if (noti === null) noti = { total: 0, highlight: 0 };
      const childNoti = notifications.getNoti(roomId);
      noti.total += childNoti.total;
      noti.highlight += childNoti.highlight;
    });

    return noti;
  }
  function getDMsNoti() {
    if (roomList.directs.size === 0) return null;
    let noti = null;

    [...roomList.directs].forEach((roomId) => {
      if (!notifications.hasNoti(roomId)) return;
      if (noti === null) noti = { total: 0, highlight: 0 };
      const childNoti = notifications.getNoti(roomId);
      noti.total += childNoti.total;
      noti.highlight += childNoti.highlight;
    });

    return noti;
  }

  const dmsNoti = getDMsNoti();
  const homeNoti = getHomeNoti();

  return (
    <>
      <SidebarAvatar
        tooltip="Home"
        active={selectedTab === cons.tabs.HOME}
        onClick={() => selectTab(cons.tabs.HOME)}
        avatar={<Avatar iconSrc={HomeIC} size="normal" />}
        notificationBadge={homeNoti ? (
          <NotificationBadge
            alert={homeNoti?.highlight > 0}
            content={abbreviateNumber(homeNoti.total) || null}
          />
        ) : null}
      />
      <SidebarAvatar
        tooltip="People"
        active={selectedTab === cons.tabs.DIRECTS}
        onClick={() => selectTab(cons.tabs.DIRECTS)}
        avatar={<Avatar iconSrc={UserIC} size="normal" />}
        notificationBadge={dmsNoti ? (
          <NotificationBadge
            alert={dmsNoti?.highlight > 0}
            content={abbreviateNumber(dmsNoti.total) || null}
          />
        ) : null}
      />
    </>
  );
}

function DraggableSpaceShortcut({
  isActive, spaceId, index, moveShortcut, onDrop,
}) {
  const mx = initMatrix.matrixClient;
  const { notifications } = initMatrix;
  const room = mx.getRoom(spaceId);
  const shortcutRef = useRef(null);
  const avatarRef = useRef(null);

  const openSpaceOptions = (e, sId) => {
    e.preventDefault();
    openReusableContextMenu(
      'right',
      getEventCords(e, '.sidebar-avatar'),
      (closeMenu) => <SpaceOptions roomId={sId} afterOptionSelect={closeMenu} />,
    );
  };

  const [, drop] = useDrop({
    accept: 'SPACE_SHORTCUT',
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    drop(item) {
      onDrop(item.index, item.spaceId);
    },
    hover(item, monitor) {
      if (!shortcutRef.current) return;

      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;

      const hoverBoundingRect = shortcutRef.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }
      moveShortcut(dragIndex, hoverIndex);
      // eslint-disable-next-line no-param-reassign
      item.index = hoverIndex;
    },
  });
  const [{ isDragging }, drag] = useDrag({
    type: 'SPACE_SHORTCUT',
    item: () => ({ spaceId, index }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(avatarRef);
  drop(shortcutRef);

  if (shortcutRef.current) {
    if (isDragging) shortcutRef.current.style.opacity = 0;
    else shortcutRef.current.style.opacity = 1;
  }

  return (
    <SidebarAvatar
      ref={shortcutRef}
      active={isActive}
      tooltip={room.name}
      onClick={() => selectTab(spaceId)}
      onContextMenu={(e) => openSpaceOptions(e, spaceId)}
      avatar={(
        <Avatar
          ref={avatarRef}
          text={room.name}
          bgColor={colorMXID(room.roomId)}
          size="normal"
          imageSrc={room.getAvatarUrl(initMatrix.matrixClient.baseUrl, 42, 42, 'crop') || null}
        />
      )}
      notificationBadge={notifications.hasNoti(spaceId) ? (
        <NotificationBadge
          alert={notifications.getHighlightNoti(spaceId) > 0}
          content={abbreviateNumber(notifications.getTotalNoti(spaceId)) || null}
        />
      ) : null}
    />
  );
}

DraggableSpaceShortcut.propTypes = {
  spaceId: PropTypes.string.isRequired,
  isActive: PropTypes.bool.isRequired,
  index: PropTypes.number.isRequired,
  moveShortcut: PropTypes.func.isRequired,
  onDrop: PropTypes.func.isRequired,
};

function SpaceShortcut() {
  const { accountData } = initMatrix;
  const [selectedTab] = useSelectedTab();
  useNotificationUpdate();
  const [spaceShortcut, setSpaceShortcut] = useState([...accountData.spaceShortcut]);

  useEffect(() => {
    const handleShortcut = () => setSpaceShortcut([...accountData.spaceShortcut]);
    accountData.on(cons.events.accountData.SPACE_SHORTCUT_UPDATED, handleShortcut);
    return () => {
      accountData.removeListener(cons.events.accountData.SPACE_SHORTCUT_UPDATED, handleShortcut);
    };
  }, []);

  const moveShortcut = (dragIndex, hoverIndex) => {
    const dragSpaceId = spaceShortcut[dragIndex];
    const newShortcuts = [...spaceShortcut];
    newShortcuts.splice(dragIndex, 1);
    newShortcuts.splice(hoverIndex, 0, dragSpaceId);
    setSpaceShortcut(newShortcuts);
  };

  const handleDrop = (dragIndex, dragSpaceId) => {
    if ([...accountData.spaceShortcut][dragIndex] === dragSpaceId) return;
    moveSpaceShortcut(dragSpaceId, dragIndex);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      {
        spaceShortcut.map((shortcut, index) => (
          <DraggableSpaceShortcut
            key={shortcut}
            index={index}
            spaceId={shortcut}
            isActive={selectedTab === shortcut}
            moveShortcut={moveShortcut}
            onDrop={handleDrop}
          />
        ))
      }
    </DndProvider>
  );
}

function SideBar() {
  return (
    <div className="sidebar">
      <div className="sidebar__scrollable">
        <ScrollView invisible>
          <div className="scrollable-content">
            <div className="featured-container">
              <FeaturedTab />
            </div>
            <div className="sidebar-divider" />
            <div className="space-container">
              <SpaceShortcut />
              <SidebarAvatar
                tooltip="Pin spaces"
                onClick={() => openShortcutSpaces()}
                avatar={<Avatar iconSrc={AddPinIC} size="normal" />}
              />
            </div>
          </div>
        </ScrollView>
      </div>
    </div>
  );
}

export default SideBar;
