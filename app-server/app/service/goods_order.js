'use strict';

const Service = require('egg').Service;

/**
 * Service - 订单
 * @class
 * @author ruiyong-lee
 */
class GoodsOrderService extends Service {
  /**
   * 获取订单分页列表
   * @param {object} params - 条件
   * @return {object|null} - 查找结果
   */
  async query(params = {}) {
    const { app, ctx } = this;
    const { Sequelize } = app;
    return await app.model.GoodsOrder.query({
      ...params,
      filter: ctx.helper.JSONParse(params.filter),
      pagination: ctx.helper.JSONParse(params.pagination),
      attributes: [
        'uuid', 'version', 'status', 'billNumber', 'customerName', 'deliveryTimeTypeName',
        'remark', 'createdTime', 'linkMan', 'linkPhone',
        [Sequelize.fn('0+CAST', Sequelize.literal('goodsTotalQty AS CHAR')), 'goodsTotalQty'],
        [Sequelize.fn('ROUND', Sequelize.col('paymentAmount'), 2), 'paymentAmount'],
      ],
    });
  }

  /**
   * 获取订单分页列表（小程序使用）
   * @param {object} params - 条件
   * @return {object|null} - 查找结果
   */
  async queryForWeapp(params = {}) {
    const { app, ctx } = this;
    const { Sequelize } = app;
    return await app.model.GoodsOrder.query({
      ...params,
      filter: ctx.helper.JSONParse(params.filter),
      pagination: ctx.helper.JSONParse(params.pagination),
      attributes: [
        'uuid', 'version', 'status', 'billNumber',
        [Sequelize.fn('0+CAST', Sequelize.literal('goodsTotalQty AS CHAR')), 'goodsTotalQty'],
        [Sequelize.fn('ROUND', Sequelize.col('paymentAmount'), 2), 'paymentAmount'],
      ],
    });
  }

  /**
   * 获取订单
   * @param {string} uuid - 订单uuid
   * @return {object|null} - 查找结果
   */
  async get(uuid) {
    const { app } = this;
    const { Sequelize } = app;
    return await app.model.GoodsOrder.get({
      uuid,
      orderAttributes: [
        'uuid', 'version', 'status', 'billNumber', 'addressUuid', 'linkMan', 'linkPhone', 'address',
        'deliveryTimeTypeUuid', 'deliveryTimeTypeName', 'deliveryTimeTypeRemark', 'remark', 'createdTime',
        [Sequelize.fn('ROUND', Sequelize.col('totalAmount'), 2), 'totalAmount'],
        [Sequelize.fn('ROUND', Sequelize.col('freightAmount'), 2), 'freightAmount'],
        [Sequelize.fn('ROUND', Sequelize.col('paymentAmount'), 2), 'paymentAmount'],
        [Sequelize.fn('ROUND', Sequelize.col('deliveryTimeTypeSurcharge'), 2), 'deliveryTimeTypeSurcharge'],
      ],
      orderLineAttributes: [
        'uuid', 'goodsPic', 'unitName', 'goodsName', 'goodsUuid', 'remark',
        [Sequelize.fn('ROUND', Sequelize.col('salePrice'), 2), 'salePrice'],
        [Sequelize.fn('0+CAST', Sequelize.literal('goodsQty AS CHAR')), 'goodsQty'],
      ],
    });
  }

  /**
   * 创建订单
   * @param {object} params - 条件
   * @return {string} - 订单uuid
   */
  async saveNew({ merchantUuid, goodsOrder = {}, openId, nickName }) {
    const { app } = this;
    const crateInfo = app.getCrateInfo(openId, nickName);
    const billNumber = await app.getBillNumber('DG');
    const { lines = [] } = goodsOrder;
    const params = {
      goodsOrder: {
        ...goodsOrder,
        ...crateInfo,
        billNumber,
        orgUuid: merchantUuid,
        customerUuid: openId,
        customerName: nickName,
      },
      goodsOrderLines: lines.map((line = {}) => {
        const { goods } = line;
        return {
          ...line,
          goodsUuid: goods.uuid,
          goodsName: goods.name,
        };
      }),
    };

    const goodsUuid = await app.model.GoodsOrder.saveNew(params);

    // 超过30分钟自动取消订单
    app.addDelayTask('cancelOrder', goodsUuid, {}, 30 * 60);

    return goodsUuid;
  }

  /**
   * 取消订单
   * @param {object} params - 条件
   * @return {string} - 订单uuid
   */
  async cancel(params = {}) {
    const { app } = this;
    const { version, openId, nickName } = params;
    const modifyInfo = app.getModifyInfo(version, openId, nickName);
    return await app.model.GoodsOrder.cancel({ ...params, ...modifyInfo });
  }

  /**
   * 配送订单
   * @param {object} params - 条件
   * @return {string} - 订单uuid
   */
  async dispatch(params = {}) {
    const { app } = this;
    const { version, userUuid, userName } = params;
    const modifyInfo = app.getModifyInfo(version, userUuid, userName);
    return await app.model.GoodsOrder.dispatch({ ...params, ...modifyInfo });
  }

  /**
   * 完成订单
   * @param {object} params - 条件
   * @return {string} - 订单uuid
   */
  async complete(params = {}) {
    const { app } = this;
    const { version, userUuid, userName } = params;
    const modifyInfo = app.getModifyInfo(version, userUuid, userName);
    return await app.model.GoodsOrder.complete({ ...params, ...modifyInfo });
  }
}

module.exports = GoodsOrderService;
