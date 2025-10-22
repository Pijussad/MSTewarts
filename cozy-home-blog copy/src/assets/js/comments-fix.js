/**
 * Enhanced fix for Cusdis comments display
 * This script makes the comments area fully dynamic and removes scrollbars
 * It also provides a fallback for local development
 */
document.addEventListener('DOMContentLoaded', function() {
  // Check if we're in local development (for fallback display)
  const isLocalDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  // Create a fallback message for local development
  if (isLocalDevelopment) {
    const cusdisThreadElem = document.getElementById('cusdis_thread');
    if (cusdisThreadElem) {
      // Replace the content of the Cusdis thread element instead of adding before it
      cusdisThreadElem.innerHTML = '';
      cusdisThreadElem.style.padding = '20px';
      cusdisThreadElem.style.backgroundColor = '#2a2a2a';
      cusdisThreadElem.style.border = '1px solid #ff1493';
      cusdisThreadElem.style.color = 'white';
      cusdisThreadElem.style.marginTop = '20px';
      cusdisThreadElem.style.marginBottom = '20px';
      cusdisThreadElem.innerHTML = `
        <h3 style="color: #ff1493; margin-bottom: 15px;">💬 Comments Preview</h3>
        <p style="margin-bottom: 10px;">Comments are fully functional only when deployed to production.</p>
        <p style="margin-bottom: 10px;">In local development, you'll see CSP and 403 errors in the console - this is normal and expected.</p>
        <div style="background-color: #1a1a1a; padding: 15px; margin-top: 20px; border-left: 3px solid #ff1493;">
          <p style="color: #ff69b4; font-weight: bold;">Demo User</p>
          <p style="color: #a0a0a0; font-size: 0.8rem;">October 22, 2025</p>
          <p style="color: white; margin-top: 10px;">This is how comments will appear when deployed to production. The styling will match your site's emo aesthetic.</p>
        </div>
      `;
      
      // Prevent the Cusdis script from loading in local development
      const cusdisScript = document.querySelector('script[src*="cusdis"]');
      if (cusdisScript) {
        cusdisScript.parentNode.removeChild(cusdisScript);
      }
      
      return; // Skip the rest of the function for local development
    }
  }
  
  // Function to handle iframe resizing
  const resizeIframe = function(iframe) {
    try {
      // Try to access iframe content
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      
      // Create and inject custom styles into the iframe
      const style = document.createElement('style');
      style.textContent = `
        html, body {
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
          background-color: #1a1a1a !important;
        }
        
        .comment-container, .comment-wrapper, .cusdis-comment-container {
          height: auto !important;
          max-height: none !important;
          overflow: visible !important;
        }
        
        textarea {
          min-height: 150px !important;
          resize: vertical !important;
          background-color: #2a2a2a !important;
          color: white !important;
          border: 1px solid #ff1493 !important;
          padding: 10px !important;
        }
        
        input[type="text"], input[type="email"] {
          background-color: #2a2a2a !important;
          color: white !important;
          border: 1px solid #ff1493 !important;
          padding: 10px !important;
          height: auto !important;
        }
        
        button {
          background-color: #ff1493 !important;
          color: black !important;
          border: none !important;
          padding: 10px 15px !important;
          cursor: pointer !important;
          transition: all 0.3s ease !important;
          text-transform: uppercase !important;
        }
        
        button:hover {
          background-color: black !important;
          color: #ff1493 !important;
        }
        
        .cusdis-comment {
          border-left: 3px solid #ff1493 !important;
          padding: 10px !important;
          margin-bottom: 15px !important;
          background-color: #2a2a2a !important;
        }
        
        .comment-author {
          color: #ff69b4 !important;
          font-weight: bold !important;
        }
        
        .comment-content {
          color: white !important;
        }
      `;
      iframeDoc.head.appendChild(style);
      
      // Dynamically adjust iframe height based on content
      const adjustHeight = function() {
        const newHeight = iframeDoc.body.scrollHeight;
        iframe.style.height = (newHeight + 50) + 'px';
        
        // Also adjust parent container if needed
        const cusdisThreadElem = document.getElementById('cusdis_thread');
        if (cusdisThreadElem) {
          cusdisThreadElem.style.height = (newHeight + 100) + 'px';
        }
      };
      
      // Initial adjustment
      adjustHeight();
      
      // Set up a MutationObserver within the iframe to detect content changes
      const iframeObserver = new MutationObserver(function() {
        adjustHeight();
      });
      
      // Observe the iframe document body for changes
      iframeObserver.observe(iframeDoc.body, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
      });
      
      // Also adjust on window resize
      iframe.contentWindow.addEventListener('resize', adjustHeight);
      
    } catch(e) {
      // Handle cross-origin restrictions
      console.log('Could not access iframe content due to cross-origin policy');
      
      // Set a generous height for the iframe as fallback
      iframe.style.height = '800px';
    }
  };

  // Function to observe iframe creation in the main document
  function setupIframeObserver() {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes) {
          mutation.addedNodes.forEach(function(node) {
            if (node.tagName === 'IFRAME' && node.src.includes('cusdis')) {
              // Apply initial styles
              node.style.border = 'none';
              node.style.width = '100%';
              node.style.height = '600px'; // Starting height
              node.style.overflow = 'hidden';
              
              // Handle iframe load event
              if (node.contentDocument && node.contentDocument.readyState === 'complete') {
                resizeIframe(node);
              } else {
                node.onload = function() {
                  resizeIframe(node);
                };
              }
            }
          });
        }
      });
    });
    
    // Start observing the document
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // Initialize
  setupIframeObserver();
  
  // Style the container
  const cusdisThreadElem = document.getElementById('cusdis_thread');
  if (cusdisThreadElem) {
    cusdisThreadElem.style.overflow = 'visible';
    cusdisThreadElem.style.height = 'auto';
    cusdisThreadElem.style.minHeight = '600px';
    cusdisThreadElem.style.backgroundColor = '#1a1a1a';
    cusdisThreadElem.style.padding = '20px';
    cusdisThreadElem.style.border = '1px solid #ff1493';
  }
});