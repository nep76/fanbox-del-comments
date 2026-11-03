async function delete_comment( comment )
{
    const ls_ac = document.querySelectorAll( '[class*="styled__Body"]' );
    if( ls_ac.length === 0 ) return;

    let delete_button, timeout;

    for( const ac of ls_ac ){
        if( ac.children[1].textContent.includes( comment ) ){
            delete_button = ac.children[2].lastChild;
        }
    }
    if( ! delete_button ) return;

    const modal_confirm = new MutationObserver( ( _mls, obs ) => {
        const modal_buttons_wrapper = document.querySelector( '[class*="CommentDeleteConfirmModal__ButtonWrapper"]' );
        if( modal_buttons_wrapper ){
            modal_buttons_wrapper.lastChild.click();
        }
        clearTimeout( timeout );
        obs.disconnect();
    } );

    modal_confirm.observe( document.body, {
        childList: true,
        subtree: true
    } );

    delete_button.click();

    timeout = setTimeout( () => {
        modal_confirm.disconnect();
    }, 5000 );
}

async function wait_for_tab( tid )
{
    return new Promise((resolve) => {
        const listener = ( id, info ) => {
            if( id === tid && info.status === 'complete' ){
                chrome.tabs.onUpdated.removeListener( listener );
                resolve();
            }
        };
        chrome.tabs.onUpdated.addListener( listener );
    });
}

async function dispatch_delete_comment( list )
{
    const origin = "https://www.fanbox.cc";

    for( const data of list ){
        const uri = `${origin}${data.path}`;

        try{
            const tab = await chrome.tabs.create( {
                url: uri,
                active: false
            } );

            await wait_for_tab( tab.id );

            await chrome.scripting.executeScript( {
                target: { tabId: tab.id },
                func: delete_comment,
                args: [ data.comment ]
            } );

            await chrome.tabs.remove( tab.id );

            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch( e ){
            console.error( e );
        }
    }
}

chrome.runtime.onMessage.addListener( ( message, _sender, sendResponse ) => {
    dispatch_delete_comment( message.data ).then( () => {
        sendResponse( { status: "success" } );
    } );

    return true;
});
