//

function addCheckbox( user_node, body_node )
{
    if( ! user_node || ! body_node || ! user_node.parentElement ){
        console.log( "fanbox-del-comments-ui: failed to add checkbox" );
        return;
    }

    const checkbox = document.createElement( "input" );
    checkbox.type = "checkbox";
    checkbox.className = "fanbox-del-comments-ui-checkbox";

    checkbox.dataset.fdcArticle = user_node.parentElement.getAttribute( "href" );
    checkbox.dataset.fdcComment = body_node.textContent;

    checkbox.style.setProperty( "appearance", "checkbox" );
    checkbox.style.setProperty( "display", "block" );
    checkbox.style.setProperty( "width", "revert", "important" );
    checkbox.style.setProperty( "height", "100%", "important" );
    checkbox.style.setProperty( "position", "absolute" );
    checkbox.style.setProperty( "translate", "-25px -28px" );

    checkbox.addEventListener( "click", ( e ) => {
        e.stopPropagation();
    } );

    user_node.parentElement.style.setProperty( "position", "relative" );
    user_node.parentElement.style.setProperty( "padding-left", "35px" );
    user_node.parentElement.prepend( checkbox );
}

function sendDeleteComments( notifications )
{
    const delete_targets = notifications.querySelectorAll( ".fanbox-del-comments-ui-checkbox:checked" );
    if( ! delete_targets.length ) return;

    const list = Array.from( delete_targets ).map( target => ( {
        path: target.dataset.fdcArticle,
        comment: target.dataset.fdcComment
    } ) );

    const prog_scr = document.createElement( "p" );
    prog_scr.textContent = "削除中...";
    prog_scr.style.setProperty( "position", "fixed" );
    prog_scr.style.setProperty( "top", "0" );
    prog_scr.style.setProperty( "left", "0" );
    prog_scr.style.setProperty( "width", "100vw" );
    prog_scr.style.setProperty( "height", "100vh" );
    prog_scr.style.setProperty( "background-color", "rgba( 255,255,255,0.7 )" );
    prog_scr.style.setProperty( "z-index", "9999" );
    prog_scr.style.setProperty( "display", "flex" );
    prog_scr.style.setProperty( "justify-content", "center" );
    prog_scr.style.setProperty( "align-items", "center" );
    prog_scr.style.setProperty( "color", "#444" );
    prog_scr.style.setProperty( "font-size", "3em" );
    document.body.appendChild( prog_scr );

    chrome.runtime.sendMessage( { data: list }, () => {
        try{
            if( chrome.runtime.lastError ){
                throw new Error( "fanbox-del-comments-ui: failed to sendMessage" );
            }

            delete_targets.forEach( e => {
                e.parentElement.style.setProperty( "filter", "grayscale(100%)" );
                e.parentElement.style.setProperty( "opacity", "0.5" );
                e.parentElement.removeChild( e );
            } );
        } catch( e ){
            console.error( e );
        } finally{
            document.body.removeChild( prog_scr );
        }
    } );
}

(() => {
    const delete_anchor = document.createElement( "a" );
    delete_anchor.textContent = "対象コメントをすべて削除";
    delete_anchor.href = "#";
    delete_anchor.addEventListener( "click", ( e ) => {
        e.preventDefault();
        sendDeleteComments( notifications );
    } );

    const observer = new MutationObserver( ( mls ) => {
        const controls = document.querySelector( '[class*="BellNotificationList__Header"]' );
        if( ! controls ){
            console.log( "fanbox-del-comments-ui: BellNotificationList__Header not found" );
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
                        const ntf_user = e.querySelector( '[class*="UserIcon__Icon"]', '[class*="UserIcon__NoIcon"]' );
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
        console.log( "fanbox-del-comments-ui: ListComponent__Wrapper not found" );
        return;
    }

    notifications.querySelectorAll( '[class*="styled__NotificationLink"] > [class*="UserIcon__Icon"]:first-child' ).forEach( addCheckbox );

    observer.observe( notifications, {
        childList: true,
        subtree: true
    } );
})();