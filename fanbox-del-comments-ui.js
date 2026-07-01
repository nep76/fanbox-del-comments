//

function addCheckbox( user_node, body_node )
{
    if( ! user_node || ! body_node || ! user_node.parentElement ){
        console.log( "fanbox-del-comments-4notification: failed to add checkbox" );
        return;
    }

    const checkbox = document.createElement( "input" );
    checkbox.type = "checkbox";
    checkbox.className = "fanbox-del-comments-4notification-checkbox";

    checkbox.dataset.fdcArticle = user_node.parentElement.getAttribute( "href" );
    checkbox.dataset.fdcComment = body_node.textContent;

    checkbox.style.setProperty( "appearance", "checkbox" );
    checkbox.style.setProperty( "display", "block" );
    checkbox.style.setProperty( "width", "revert", "important" );
    checkbox.style.setProperty( "height", "revert", "important" );
    checkbox.style.setProperty( "position", "absolute" );
    checkbox.style.setProperty( "translate", "-25px 10px" );

    checkbox.addEventListener( "click", ( e ) => {
        event.stopPropagation();
    } );

    user_node.parentElement.style.setProperty( "padding-left", "35px" );
    user_node.parentElement.prepend( checkbox );
}

function sendDeleteComments( notifications )
{
    const delete_targets = notifications.querySelectorAll( ".fanbox-del-comments-4notification-checkbox:checked" );
    if( ! delete_targets.length ) return;

    const list = Array.from( delete_targets ).map( target => ( {
        path: target.dataset.fdcArticle,
        comment: target.dataset.fdcComment
    } ) );

    chrome.runtime.sendMessage( {
        data: list
    }, ( r ) => {
        if( chrome.runtime.lastError ){
            console.error( "fanbox-del-comments-4notification: failed to sendMessage" );
            return;
        }

        delete_targets.forEach( e => {
            e.parentElement.style.setProperty( "filter", "grayscale(100%)" );
            e.parentElement.style.setProperty( "opacity", "0.5" );
            e.parentElement.removeChild( e );
        } );
    } );
}

(() => {
    const delete_anchor = document.createElement( "a" );
    delete_anchor.textContent = "対象コメントをすべて削除";
    delete_anchor.href = "#";
    delete_anchor.addEventListener( "click", ( e ) => {
        sendDeleteComments( notifications );
    } );

    const observer = new MutationObserver( ( mls ) => {
        
        const controls = document.querySelector( '[class*="BellNotificationList__Header"]' );
        if( ! controls ){
            console.log( "fanbox-del-comments-4notification: BellNotificationList__Header not found" );
            return;
        }

        if( ! controls.contains( delete_anchor ) ){
            controls.insertBefore( delete_anchor, controls.lastElementChild );
        }

        for( const mr of mls ){
            if( mr.type === "childList" ){
                mr.addedNodes.forEach( ( node ) => {
                    if( node.nodeType !== Node.ELEMENT_NODE ) return;

                    /** @type {Element} */
                    const e = node;

                    const ntf_body = e.querySelector( '[class*="styled__Body"]' );
                    if( ntf_body ){
                        let ntf_user = e.querySelector( '[class*="UserIcon__Icon"]' );
                        if( ! ntf_user ){
                            ntf_user = e.querySelector( '[class*="UserIcon__NoIcon"]' );
                        }
                        if( ntf_user ){
                            addCheckbox( ntf_user, ntf_body );
                        }
                    }
                } );
            }
        }
    } );

    const notifications = document.body;
    if( ! notifications ){
        console.log( "fanbox-del-comments-4notification: ListComponent__Wrapper not found" );
        return;
    }

    //notifications.style.setProperty( "padding-left", "2em" );
    notifications.querySelectorAll( '[class*="styled__NotificationLink"] > [class*="UserIcon__Icon"]:first-child' ).forEach( addCheckbox );

    observer.observe( notifications, {
        childList: true,
        subtree: true
    } );
})();