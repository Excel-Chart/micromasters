# -*- coding: utf-8 -*-
# Generated by Django 1.9.6 on 2016-05-24 18:01
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('profiles', '0012_education'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='verified_micromaster_user',
            field=models.BooleanField(default=False),
        ),
    ]
