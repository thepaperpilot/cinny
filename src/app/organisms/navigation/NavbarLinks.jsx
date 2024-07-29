import React from 'react';

function NavbarLinks() {
  return (
    <>
        <li>
            <a href="https://incremental.social/all">Threads</a>
        </li>
        <li>
            <a href="https://incremental.social/microblog">Microblog</a>
        </li>
        <li>
            <a href="https://incremental.social/people">People</a>
        </li>
        <li class="active">
            <a href="https://chat.incremental.social">Chat</a>
        </li>
        <li>
            <a href="https://code.incremental.social">Code</a>
        </li>
    </>
  );
}

export default NavbarLinks;
