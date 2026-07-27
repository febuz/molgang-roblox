// Standard three.js WebXR AR entry-point button (matches the r170 addon API
// vendored in ../../three.module.js). Not part of the upstream vendor drop --
// added so lab3d can offer immersive-ar without pulling the whole examples
// tree in just for this one file.
class ARButton {

	static createButton( renderer, sessionInit = {} ) {

		const button = document.createElement( 'button' );

		function showStartAR() {

			let currentSession = null;

			async function onSessionStarted( session ) {

				session.addEventListener( 'end', onSessionEnded );

				// 'local-floor' anchors y=0 to the device's real-world floor
				// estimate; plain 'local' anchors it to wherever the session
				// started (roughly headset/hand height), which floats the
				// whole scene at head height with no floor reference -- the
				// exact bug already hit and fixed in the Moleculia world.
				renderer.xr.setReferenceSpaceType( 'local-floor' );
				await renderer.xr.setSession( session );
				button.textContent = 'EXIT AR';

				currentSession = session;

			}

			function onSessionEnded() {

				currentSession.removeEventListener( 'end', onSessionEnded );

				button.textContent = 'ENTER AR';

				currentSession = null;

			}

			button.style.display = '';
			button.style.cursor = 'pointer';
			button.style.left = 'calc(50% - 50px)';
			button.style.width = '100px';
			button.textContent = 'ENTER AR';

			button.onmouseenter = () => { button.style.opacity = '1.0'; };
			button.onmouseleave = () => { button.style.opacity = '0.5'; };

			button.onclick = () => {
				if ( currentSession === null ) {
					navigator.xr.requestSession( 'immersive-ar', sessionInit ).then( onSessionStarted );
				} else {
					currentSession.end();
				}
			};

		}

		function disableButton() {

			button.style.display = '';
			button.style.cursor = 'auto';
			button.style.left = 'calc(50% - 75px)';
			button.style.width = '150px';
			button.onmouseenter = null;
			button.onmouseleave = null;
			button.onclick = null;

		}

		function showARNotSupported() {

			disableButton();
			button.textContent = 'AR NOT SUPPORTED';

		}

		function showARNotAllowed( exception ) {

			disableButton();
			console.warn( 'Exception when trying to call xr.isSessionSupported', exception );
			button.textContent = 'AR NOT ALLOWED';

		}

		function stylizeElement( element ) {

			element.style.position = 'absolute';
			element.style.bottom = '20px';
			element.style.padding = '12px 6px';
			element.style.border = '1px solid #fff';
			element.style.borderRadius = '4px';
			element.style.background = 'rgba(0,0,0,0.1)';
			element.style.color = '#fff';
			element.style.font = 'normal 13px sans-serif';
			element.style.textAlign = 'center';
			element.style.opacity = '0.5';
			element.style.outline = 'none';
			element.style.zIndex = '999';

		}

		if ( 'xr' in navigator ) {

			button.id = 'ARButton';
			button.style.display = 'none';
			stylizeElement( button );

			navigator.xr.isSessionSupported( 'immersive-ar' ).then( ( supported ) => {
				supported ? showStartAR() : showARNotSupported();
			} ).catch( showARNotAllowed );

			return button;

		} else {

			const message = document.createElement( 'a' );

			if ( window.isSecureContext === false ) {
				message.href = document.location.href.replace( /^http:/, 'https:' );
				message.innerHTML = 'WEBXR NEEDS HTTPS';
			} else {
				message.href = 'https://immersiveweb.dev/';
				message.innerHTML = 'WEBXR NOT AVAILABLE';
			}

			message.style.left = 'calc(50% - 90px)';
			message.style.width = '180px';
			message.style.textDecoration = 'none';
			stylizeElement( message );

			return message;

		}

	}

}

export { ARButton };
