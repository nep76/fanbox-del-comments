async function delete_comment( comment )
{
    let delete_button, wait_for_delete = false;

    const ls_ac = document.querySelectorAll( '[class*="styled__Body"]' );
    if( ! ls_ac.length ){
        throw new Error( "Comments not found" );
    }
    for( const ac of ls_ac ){
        if( ac.children[1].textContent.includes( comment ) ){
            delete_button = ac.children[2].lastElementChild;
            break;
        }
    }
    if( ! delete_button ){
        throw new Error( "Target comment not found" );
    }

    const job = new Promise( ( resolve, reject ) => {
        let timeout;

        const modal_confirm = new MutationObserver( ( _mls, obs ) => {
            if( delete_button.isConnected ){

                if( wait_for_delete ) return;

                const modal_buttons_wrapper = document.querySelector( '[class*="CommentDeleteConfirmModal__ButtonWrapper"]' );
                if( modal_buttons_wrapper ){
                    modal_buttons_wrapper.lastElementChild.click();
                    wait_for_delete = true;
                }
            } else{
                clearTimeout( timeout );
                obs.disconnect();

                if( wait_for_delete ){
                    resolve();
                } else{
                    reject( new Error( "The comment has been disappear?" ) );
                }
            }
        } );

        modal_confirm.observe( document.body, {
            childList: true,
            subtree: true
        } );

        timeout = setTimeout( () => {
            modal_confirm.disconnect();
            reject( new Error( "The confirm dialog is not found." ) );
        }, 5000 );
    } );

    delete_button.click();

    await job;
}

function wait_for_tab_async( tid )
{
    return new Promise( ( resolve, reject ) => {
        let timeout;
        let locked = false;

        const listener = ( id, info ) => {
            if( id === null || ( id === tid && info.status === "complete" ) ){
                if( locked ) return;
                locked = true;

                chrome.tabs.onUpdated.removeListener( listener );
                clearTimeout( timeout );
                
                if( id === null ){
                    reject( new Error( "An error occurred while opening the tab", { cause: info } ) );
                } else{
                    resolve();
                }
            }
        };
        
        chrome.tabs.onUpdated.addListener( listener );
        
        chrome.tabs.get( tid ).then( ( tab ) => listener( tid, { status: tab.status } ) ).catch( ( e ) => listener( null, e ) );

        timeout = setTimeout( () => { listener( null, { reason: "timed out" } ) }, 5000 );
    }) ;
}

async function dispatch_delete_comment( list )
{
    const origin = "https://www.fanbox.cc";


    for( const data of list ){
        const uri = `${origin}${data.path}`;

        let tab;
        try{
            tab = await chrome.tabs.create( {
                url: uri,
                active: false
            } );

            await wait_for_tab_async( tab.id );

            await chrome.scripting.executeScript( {
                target: { tabId: tab.id },
                func: delete_comment,
                args: [ data.comment ]
            } );

            await new Promise( resolve => setTimeout( resolve, 1000 ) );
        } catch( e ){
            console.error( e );
        } finally{
            if( tab ) await chrome.tabs.remove( tab.id ).catch( () => {} );
        }
    }
}

chrome.runtime.onMessage.addListener( ( message, _sender, sendResponse ) => {
    dispatch_delete_comment( message.data ).then( () => {
        sendResponse( { status: "success" } );
    } ).catch( ( e ) => {
        console.error( e );
        sendResponse( { status: "error", message: e.message } );
    } );

    return true;
});
