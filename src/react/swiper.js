import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { getParams } from './get-params';
import { initSwiper } from './init-swiper';
import { needsScrollbar, needsNavigation, needsPagination, uniqueClasses } from './utils';
import { renderLoop, calcLoopedSlides } from './loop';
import { getChangedParams } from './get-changed-params';
import { getSlidesFromChildren } from './get-slides-from-children';
import { updateSwiper } from './update-swiper';
import { renderVirtual, updateOnVirtualData } from './virtual';

const Swiper = ({
  className,
  tag: Tag = 'div',
  wrapperTag: WrapperTag = 'div',
  children,
  onSwiper,
  ...rest
} = {}) => {
  const [containerClasses, setContainerClasses] = useState('swiper-container');
  const [virtualData, setVirtualData] = useState(null);
  const initializedRef = useRef(false);
  const swiperElRef = useRef(null);
  const swiperRef = useRef(null);
  const oldPassedParamsRef = useRef(null);
  const oldSlidesLength = useRef(null);

  const nextElRef = useRef(null);
  const prevElRef = useRef(null);
  const paginationElRef = useRef(null);
  const scrollbarElRef = useRef(null);

  const { params: swiperParams, passedParams, rest: restProps } = getParams(rest);

  const slides = getSlidesFromChildren(children);

  const changedParams = getChangedParams(
    passedParams,
    oldPassedParamsRef.current,
    slides.length,
    oldSlidesLength.current,
  );

  oldPassedParamsRef.current = passedParams;
  oldSlidesLength.current = slides.length;

  Object.assign(swiperParams.on, {
    _containerClasses: setContainerClasses,
    _swiper(swiper) {
      swiper.loopCreate = () => {};
      swiper.loopDestroy = () => {};
      if (swiperParams.loop) {
        swiper.loopedSlides = calcLoopedSlides(slides, swiperParams);
      }
      swiperRef.current = swiper;
      if (swiper.virtual && swiper.params.virtual.enabled) {
        swiper.virtual.slides = slides;
        swiper.params.virtual.cache = false;
        swiper.params.virtual.renderExternal = setVirtualData;
        swiper.params.virtual.renderExternalUpdate = false;
      }
    },
  });

  // set initialized flag
  useEffect(() => {
    if (!initializedRef.current && swiperRef.current) {
      swiperRef.current.emitSlidesClasses();
      initializedRef.current = true;
    }
  });

  // watch for params change
  useLayoutEffect(() => {
    if (changedParams.length && swiperRef.current && !swiperRef.current.destroyed) {
      updateSwiper(swiperRef.current, slides, passedParams, changedParams);
    }
  });

  // update on virtual update
  useLayoutEffect(() => {
    updateOnVirtualData(swiperRef.current);
  }, [virtualData]);

  // init swiper
  useLayoutEffect(() => {
    if (!swiperElRef.current) return;
    initSwiper(
      {
        el: swiperElRef.current,
        nextEl: nextElRef.current,
        prevEl: prevElRef.current,
        paginationEl: paginationElRef.current,
        scrollbarEl: scrollbarElRef.current,
      },
      swiperParams,
    );

    if (onSwiper) onSwiper(swiperRef.current);
    // eslint-disable-next-line
    return () => {
      if (swiperRef.current && !swiperRef.current.destroyed) {
        swiperRef.current.destroy();
      }
    };
  }, []);

  // bypass swiper instance to slides
  function renderSlides() {
    if (swiperParams.virtual) {
      return renderVirtual(swiperRef.current, slides, virtualData);
    }
    if (!swiperParams.loop || (swiperRef.current && swiperRef.current.destroyed)) {
      return slides.map((child) => {
        return React.cloneElement(child, { swiper: swiperRef.current });
      });
    }
    return renderLoop(swiperRef.current, slides, swiperParams);
  }

  return (
    <Tag
      ref={swiperElRef}
      className={uniqueClasses(`${containerClasses}${className ? ` ${className}` : ''}`)}
      {...restProps}
    >
      {needsNavigation(swiperParams) && (
        <>
          <div ref={prevElRef} className="swiper-button-prev" />
          <div ref={nextElRef} className="swiper-button-next" />
        </>
      )}
      {needsScrollbar(swiperParams) && <div ref={scrollbarElRef} className="swiper-scrollbar" />}
      {needsPagination(swiperParams) && <div ref={paginationElRef} className="swiper-pagination" />}
      <WrapperTag className="swiper-wrapper">{renderSlides()}</WrapperTag>
    </Tag>
  );
};

Swiper.displayName = 'Swiper';

export { Swiper };